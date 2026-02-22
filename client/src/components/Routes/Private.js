import { useState, useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from "axios";
import Spinner from "../Spinner";
// Bug: Removed unused import { set } from "mongoose"

export default function PrivateRoute() {
	const [ok, setOk] = useState(false);
	const [auth] = useAuth(); // Removed unused setter setAuth

	useEffect(() => {
		const authCheck = async () => {
			// Bug: Added try-catch for API call to prevent unhandled promise rejection
			try {
				const res = await axios.get("/api/v1/auth/user-auth");
				if (res.data.ok) {
					setOk(true);
				} else {
					setOk(false);
				}
			} catch (error) {
				setOk(false);
			}
		};
		if (auth?.token) authCheck();
	}, [auth?.token]);

	return ok ? <Outlet /> : <Spinner />;
}
