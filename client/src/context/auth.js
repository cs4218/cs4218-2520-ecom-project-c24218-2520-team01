import { useState, useContext, createContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
	const [auth, setAuth] = useState({
		user: null,
		token: "",
	});
	//Wong Sheen Kerr (A0269647J)

	// Bug: Moved axios header into useEffect with auth.token dependency, previously set before useEffect loaded auth, causing stale header
	useEffect(() => {
		axios.defaults.headers.common["Authorization"] = auth?.token;
	}, [auth?.token]);

	useEffect(() => {
		// Bug: Wrapped localStorage access in try-catch to prevent app crash if getItem or JSON.parse fails
		try {
			const data = localStorage.getItem("auth");
			if (data) {
				const parseData = JSON.parse(data);
				// Bug: Just set the direct object instead of using {...auth, ...} spread to avoid stale closure capturing outdated state values
				setAuth({
					user: parseData.user,
					token: parseData.token,
				});
			}
		} catch (error) {
			console.error("Error loading auth from localStorage:", error);
		}
	}, []);
	return (
		<AuthContext.Provider value={[auth, setAuth]}>
			{children}
		</AuthContext.Provider>
	);
};

// custom hook
const useAuth = () => useContext(AuthContext);

export { useAuth, AuthProvider };
