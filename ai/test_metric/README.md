## Steps to run generater_mcc.py

1. Run `pip install -r ai\test_metric\requirements.txt` from project root in terminal
2. Run `python ai\test_metric\generate_mcc.py <filename>` from project root in terminal
3. Check the mcc_reports folder for the generated multiple condition coverage report

## Example

``` bash
python ai\test_metric\generate_mcc.py controllers\authController.js
```