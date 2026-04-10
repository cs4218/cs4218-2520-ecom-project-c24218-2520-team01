#!/usr/bin/env python3
"""
Wong Sheen Kerr (A0269647J)

AI Usage Declaration

Tool Used: GPT-5.4

Prompt:
- Asked for help refining the structure of the soak CSV analysis script,
  including how to read large CSV files and summarize per-scenario metrics.

How the AI Output Was Used:
- Used AI advice as a reference for how to structure the analysis flow and
  the high-level JSON summary shape.
- Output was used as a reference for writing this script.

This file processes the soak testing CSV row by row instead of loading the
raw 2.6GB file contents into memory at once. It still keeps the duration
samples needed to compute exact median, p95, and p99 values. It is
responsible for:
- auto-discovering the latest soak run inside tests/nft/soak/results
- scanning the k6 CSV once to detect the observed runtime bounds
- reading the k6 rows again to compute overall, per-scenario, and
  per-window statistics
- grouping the runtime into three equal thirds labelled "early", "middle", and
  "late" for long-run degradation analysis
- summarizing failure counts by request name and error text
- summarizing process-memory growth from the separate memory CSV
- output a json file containing all the summarized information

Summary field meanings used in the generated JSON:
- count: Number of duration samples included in that summary block.
- avg / median / p95 / p99 / min / max: Response-time statistics from k6 `http_req_duration` samples, in milliseconds.
- requests: Number of `http_reqs` rows seen for that block.
- throughput_rps: Requests per second over the observed runtime or window.
- failure_rate: Failure ratio from 0.0 to 1.0. Multiply by 100 to convert it to a percent.
- failures: Number of failed requests, based on `http_req_failed`.
- iteration_success_rate: Success ratio from 0.0 to 1.0 from the custom `scenario_iteration_success` metric.

Note: All floating-point values written to the summary JSON are rounded to
4 decimal places for readability.
"""

from __future__ import annotations

import csv
import json
from array import array
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from math import ceil, floor
from pathlib import Path


WINDOW_LABELS = ("early", "middle", "late")
ROUND_DIGITS = 4
RESULTS_DIR = Path(__file__).resolve().parent / "results"
PROCESS_MEMORY_SUFFIX = "-process-memory.csv"
SUMMARY_SUFFIX = "-summary.json"
SCENARIOS = (
    "catalogBrowsing",
    "authSession",
    "searchAndFilter",
    "checkoutAndOrders",
)
MEMORY_FIELDS = (
    "rss_bytes",
    "private_memory_bytes",
    "virtual_memory_bytes",
    "paged_memory_bytes",
)


@dataclass
class NumericSeries:
    """
    Store numeric samples plus the running totals needed for summaries.

    In this script, these samples are request-duration values from k6
    `http_req_duration`, so the summary values are in milliseconds.
    """

    values: array
    total: float = 0.0
    minimum: float = float("inf")
    maximum: float = float("-inf")

    def add(self, value: float) -> None:
        self.values.append(value)
        self.total += value
        if value < self.minimum:
            self.minimum = value
        if value > self.maximum:
            self.maximum = value

    @property
    def count(self) -> int:
        return len(self.values)

    def summary(self) -> dict[str, float | int | None]:
        """
        Return summary statistics for the stored duration samples.

        Returned fields:
        - count: number of duration samples
        - avg / median / p95 / p99 / min / max: duration values in milliseconds
        """

        if not self.values:
            return {
                "count": 0,
                "avg": None,
                "median": None,
                "p95": None,
                "p99": None,
                "min": None,
                "max": None,
            }

        sorted_values = array("d", sorted(self.values))
        return {
            "count": len(sorted_values),
            "avg": self.total / len(sorted_values),
            "median": percentile(sorted_values, 0.50),
            "p95": percentile(sorted_values, 0.95),
            "p99": percentile(sorted_values, 0.99),
            "min": self.minimum,
            "max": self.maximum,
        }


def new_series() -> NumericSeries:
    return NumericSeries(array("d"))


def percentile(sorted_values: array, ratio: float) -> float | None:
    """Return an interpolated percentile from a sorted numeric series."""

    if not sorted_values:
        return None
    if len(sorted_values) == 1:
        return float(sorted_values[0])

    index = (len(sorted_values) - 1) * ratio
    lower = floor(index)
    upper = ceil(index)
    if lower == upper:
        return float(sorted_values[lower])

    weight = index - lower
    return float(
        sorted_values[lower] * (1.0 - weight) + sorted_values[upper] * weight
    )


def epoch_to_iso(timestamp_seconds: int) -> str:
    return datetime.fromtimestamp(timestamp_seconds, tz=timezone.utc).isoformat()


def iso_to_epoch(timestamp_iso: str) -> float:
    return datetime.fromisoformat(timestamp_iso.replace("Z", "+00:00")).timestamp()


def bytes_to_gib(value: float | int | None) -> float | None:
    if value is None:
        return None
    return float(value) / (1024**3)


def round_output(value):
    """
    Recursively round all floating-point values in the JSON-ready output.

    This keeps the generated summary easier to read while preserving integers,
    strings, booleans, and null values as-is.
    """

    if isinstance(value, float):
        return round(value, ROUND_DIGITS)
    if isinstance(value, dict):
        return {key: round_output(item) for key, item in value.items()}
    if isinstance(value, list):
        return [round_output(item) for item in value]
    return value


def is_main_k6_csv(path: Path) -> bool:
    """Return True only for the main k6 result CSV, not the memory CSV."""

    return path.suffix == ".csv" and not path.name.endswith(PROCESS_MEMORY_SUFFIX)


def discover_latest_run_paths() -> tuple[Path, Path, Path]:
    """
    Find the latest soak result pair in tests/nft/soak/results.

    Expected files for a run:
    - soak-YYYYMMDD-HHMMSS.csv
    - soak-YYYYMMDD-HHMMSS-process-memory.csv
    - soak-YYYYMMDD-HHMMSS-summary.json (written by this script)
    """

    if not RESULTS_DIR.exists():
        raise FileNotFoundError(f"Results folder not found: {RESULTS_DIR}")

    k6_csvs = [path for path in RESULTS_DIR.glob("soak-*.csv") if is_main_k6_csv(path)]
    if not k6_csvs:
        raise FileNotFoundError(f"No soak CSV files found in: {RESULTS_DIR}")

    latest_k6_csv = max(k6_csvs, key=lambda path: (path.stat().st_mtime, path.name))
    run_name = latest_k6_csv.stem
    memory_csv = RESULTS_DIR / f"{run_name}{PROCESS_MEMORY_SUFFIX}"
    summary_json = RESULTS_DIR / f"{run_name}{SUMMARY_SUFFIX}"

    if not memory_csv.exists():
        raise FileNotFoundError(
            f"Matching process-memory CSV not found for {latest_k6_csv.name}: {memory_csv.name}"
        )

    return latest_k6_csv, memory_csv, summary_json


def build_window_bounds(start_ts: int, end_ts: int) -> tuple[float, float]:
    """
    Split the observed runtime into three equal-duration windows.

    The windows are:
    - early: the first third of the observed runtime
    - middle: the second third of the observed runtime
    - late: the final third of the observed runtime
    """

    span = max(0, end_ts - start_ts)
    return start_ts + span / 3.0, start_ts + 2.0 * span / 3.0


def classify_window(timestamp_seconds: float, boundary_1: float, boundary_2: float) -> str:
    """Map a sample timestamp into the early, middle, or late runtime window."""

    if timestamp_seconds < boundary_1:
        return "early"
    if timestamp_seconds < boundary_2:
        return "middle"
    return "late"


def detect_runtime_bounds(csv_path: Path) -> tuple[int, int]:
    """
    Find the first and last observed request timestamps in the k6 CSV.

    The analyzer uses `http_reqs` rows as the runtime anchor so the window
    boundaries match the actual period during which the soak run was issuing
    requests.
    """

    first_ts: int | None = None
    last_ts: int | None = None

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["metric_name"] != "http_reqs":
                continue
            ts = int(float(row["timestamp"]))
            if first_ts is None or ts < first_ts:
                first_ts = ts
            if last_ts is None or ts > last_ts:
                last_ts = ts

    if first_ts is None or last_ts is None:
        raise ValueError("No http_reqs rows found in the k6 CSV.")

    return first_ts, last_ts


def analyze_k6_csv(csv_path: Path) -> dict:
    """
    Read the k6 CSV output file and output a JSON summary.

    This collects:
    - overall response-time, throughput, and failure statistics
    - per-scenario breakdowns
    - per-window breakdowns for the early/middle/late thirds of the run
    - failure counts by request name and error text
    """

    start_ts, end_ts = detect_runtime_bounds(csv_path)
    boundary_1, boundary_2 = build_window_bounds(start_ts, end_ts)
    runtime_seconds = max(0, end_ts - start_ts)

    overall_durations = new_series()
    scenario_durations = {scenario: new_series() for scenario in SCENARIOS}
    window_durations = {label: new_series() for label in WINDOW_LABELS}

    request_counts = Counter()
    failure_counts = Counter()
    scenario_request_counts = Counter()
    scenario_failure_counts = Counter()
    window_request_counts = Counter()
    window_failure_counts = Counter()
    failure_request_names = Counter()
    failure_error_types = Counter()
    first_failure_timestamp_by_name: dict[str, int] = {}
    scenario_iteration_success = Counter()
    scenario_iteration_total = Counter()

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            metric_name = row["metric_name"]
            scenario = row["scenario"]
            timestamp = int(float(row["timestamp"]))

            if metric_name == "http_reqs":
                request_counts["overall"] += 1
                if scenario:
                    scenario_request_counts[scenario] += 1
                window_request_counts[
                    classify_window(timestamp, boundary_1, boundary_2)
                ] += 1
                continue

            if metric_name == "http_req_duration":
                # k6 writes http_req_duration samples in milliseconds.
                value = float(row["metric_value"])
                overall_durations.add(value)
                if scenario in scenario_durations:
                    scenario_durations[scenario].add(value)
                window_durations[
                    classify_window(timestamp, boundary_1, boundary_2)
                ].add(value)
                continue

            if metric_name == "http_req_failed":
                # k6 writes 1.0 for a failed request and 0.0 otherwise.
                failed = float(row["metric_value"]) != 0.0
                if not failed:
                    continue

                failure_counts["overall"] += 1
                if scenario:
                    scenario_failure_counts[scenario] += 1
                window_failure_counts[
                    classify_window(timestamp, boundary_1, boundary_2)
                ] += 1

                request_name = row["name"] or "(unnamed)"
                error_type = row["error"] or "(no error text)"

                failure_request_names[request_name] += 1
                failure_error_types[error_type] += 1
                first_failure_timestamp_by_name.setdefault(request_name, timestamp)
                continue

            if metric_name == "scenario_iteration_success":
                # Custom binary metric: 1.0 for a successful scenario iteration,
                # 0.0 for an unsuccessful one.
                scenario_iteration_total[scenario] += 1
                if float(row["metric_value"]) != 0.0:
                    scenario_iteration_success[scenario] += 1

    overall_summary = overall_durations.summary()
    per_scenario = {}
    for scenario in SCENARIOS:
        summary = scenario_durations[scenario].summary()
        requests = scenario_request_counts[scenario]
        failures = scenario_failure_counts[scenario]
        per_scenario[scenario] = {
            **summary,
            # Number of request events observed in this scenario.
            "requests": requests,
            # Requests per second across the full observed runtime.
            "throughput_rps": requests / runtime_seconds if runtime_seconds else None,
            # Failure ratio in the range 0.0 to 1.0; multiply by 100 for percent.
            "failure_rate": failures / requests if requests else None,
            "failures": failures,
            # Success ratio from the custom scenario_iteration_success metric.
            "iteration_success_rate": (
                scenario_iteration_success[scenario] / scenario_iteration_total[scenario]
                if scenario_iteration_total[scenario]
                else None
            ),
        }

    per_window = {}
    for label in WINDOW_LABELS:
        summary = window_durations[label].summary()
        requests = window_request_counts[label]
        failures = window_failure_counts[label]
        per_window[label] = {
            **summary,
            # Number of request events observed inside this time window.
            "requests": requests,
            # Requests per second within this third of the run only.
            "throughput_rps": requests / (runtime_seconds / 3.0) if runtime_seconds else None,
            # Failure ratio in the range 0.0 to 1.0 for this window.
            "failure_rate": failures / requests if requests else None,
            "failures": failures,
        }

    return {
        "source_csv": str(csv_path),
        "start_timestamp": start_ts,
        "end_timestamp": end_ts,
        "start_iso": epoch_to_iso(start_ts),
        "end_iso": epoch_to_iso(end_ts),
        "runtime_seconds": runtime_seconds,
        "runtime_hours": runtime_seconds / 3600 if runtime_seconds else 0.0,
        "window_boundaries": {
            "early_start": epoch_to_iso(start_ts),
            "early_end_middle_start": epoch_to_iso(int(boundary_1)),
            "middle_end_late_start": epoch_to_iso(int(boundary_2)),
            "late_end": epoch_to_iso(end_ts),
        },
        "overall": {
            **overall_summary,
            "requests": request_counts["overall"],
            "throughput_rps": (
                request_counts["overall"] / runtime_seconds if runtime_seconds else None
            ),
            "failure_rate": (
                failure_counts["overall"] / request_counts["overall"]
                if request_counts["overall"]
                else None
            ),
            "failures": failure_counts["overall"],
        },
        "per_scenario": per_scenario,
        "per_window": per_window,
        "failure_counts_by_request_name": dict(failure_request_names.most_common()),
        "failure_counts_by_error_type": dict(failure_error_types.most_common()),
        "first_failure_timestamp_by_request_name": {
            name: epoch_to_iso(ts) for name, ts in first_failure_timestamp_by_name.items()
        },
    }


def analyze_memory_csv(memory_csv_path: Path, start_ts: int, end_ts: int) -> dict:
    """
    Summarize the process-memory CSV using the same three boundaries.

    The returned summary is used as supporting evidence for whether the
    backend's memory floor appears stable or keeps rising over time.
    """

    boundary_1, boundary_2 = build_window_bounds(start_ts, end_ts)

    windows: dict[str, dict[str, dict[str, float | None]]] = {
        label: {
            field: {"min": None, "max": None}
            for field in MEMORY_FIELDS
        }
        for label in WINDOW_LABELS
    }

    first_private: float | None = None
    last_private: float | None = None
    first_sample_ts: float | None = None
    last_sample_ts: float | None = None

    with memory_csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            sample_ts = iso_to_epoch(row["timestamp_iso"])
            label = classify_window(sample_ts, boundary_1, boundary_2)

            if first_sample_ts is None:
                first_sample_ts = sample_ts
            last_sample_ts = sample_ts

            private_value = float(row["private_memory_bytes"])
            if first_private is None:
                first_private = private_value
            last_private = private_value

            for field in MEMORY_FIELDS:
                value = float(row[field])
                slot = windows[label][field]
                if slot["min"] is None or value < slot["min"]:
                    slot["min"] = value
                if slot["max"] is None or value > slot["max"]:
                    slot["max"] = value

    runtime_hours = (
        (last_sample_ts - first_sample_ts) / 3600
        if first_sample_ts is not None and last_sample_ts is not None and last_sample_ts > first_sample_ts
        else None
    )
    private_growth_bytes = (
        (last_private - first_private)
        if first_private is not None and last_private is not None
        else None
    )
    private_growth_mib_per_hour = (
        (private_growth_bytes / (1024**2)) / runtime_hours
        if private_growth_bytes is not None and runtime_hours
        else None
    )

    converted_windows = {}
    for label, field_map in windows.items():
        converted_windows[label] = {}
        for field, values in field_map.items():
            converted_windows[label][field] = {
                "min_gib": bytes_to_gib(values["min"]),
                "max_gib": bytes_to_gib(values["max"]),
            }

    return {
        "source_csv": str(memory_csv_path),
        "windows": converted_windows,
        "private_memory_start_gib": bytes_to_gib(first_private),
        "private_memory_end_gib": bytes_to_gib(last_private),
        "private_growth_mib_per_hour": private_growth_mib_per_hour,
    }


def main() -> None:
    k6_csv, memory_csv, summary_json = discover_latest_run_paths()
    result = {"k6": analyze_k6_csv(k6_csv)}
    result["memory"] = analyze_memory_csv(
        memory_csv,
        result["k6"]["start_timestamp"],
        result["k6"]["end_timestamp"],
    )

    rounded_result = round_output(result)
    output_text = json.dumps(rounded_result, indent=2)
    summary_json.write_text(output_text, encoding="utf-8")

    print(f"Analyzed: {k6_csv.name}")
    print(f"Memory CSV: {memory_csv.name}")
    print(f"Wrote summary: {summary_json.name}")


if __name__ == "__main__":
    main()
