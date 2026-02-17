// Rachel Tai Ke Jia, A0258603A

// Server-side
export const MOCK_USER = {
    _id: "user1",
    name: "Tomm",
    email: "tomm@example.com",
    password: "example-password",
    phone: "98345678",
    address: "National Road",
};

// From client to server 
export const UPDATED_PROFILE_INPUT = {
    name: "Tomm Doe",
    password: "new-password",
    phone: "98345991",
    address: "Balin Lane"
};

// Returned from database
export const UPDATED_USER = {
    ...MOCK_USER,
    ...UPDATED_PROFILE_INPUT
};
