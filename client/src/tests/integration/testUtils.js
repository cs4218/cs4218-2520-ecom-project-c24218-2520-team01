import axios from "axios";

// Lim Jia Wei, A0277381W

// Sets up a logged-in user in localStorage so tests start with an authenticated state
export const setMockAuth = (role = 1, token = "admin-token", name = "Test Admin") => {

    localStorage.setItem("auth", JSON.stringify({
        user: { name, role, email: "admin@admin.com" },
        token,
    }));
};

// Mocks the admin auth check, set to false to simulate a non-admin user
export const mockAdminAuthAPI = (isOk = true) => {
    axios.get.mockResolvedValueOnce({
        data: { ok: isOk },
    });
};

// Mocks the login API, set to false to simulate a failed login
export const mockLoginAPI = (success = true, token = "mock-admin-token", role = 1) => {
    if (success) {
        axios.post.mockResolvedValueOnce({
            data: {
                success: true,
                message: "Login successful",
                user: { name: "Test Admin", role, email: "admin@admin.com" },
                token: token
            }
        });
    } else {
        axios.post.mockRejectedValueOnce({ message: "Invalid credentials" });
    }
};
