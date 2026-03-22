// Wong Sheen Kerr (A0269647J)
export const e2eCategories = [
	{
		name: "Mac Computers",
		slug: "mac-computers",
	},
	{
		name: "iPhone Devices",
		slug: "iphone-devices",
	},
];

export const e2eProducts = [
	{
		name: "MacBook Pro M5",
		slug: "macbook-pro-m5",
		description: "The best laptop ever made!",
		price: 2499,
		category: "Mac Computers",	
		quantity: 12,
		shipping: true,
	},
	{
		name: "Mac Studio M5 Ultra",
		slug: "mac-studio-m5-ultra",
		description: "The best desktop every made!",
		price: 3999,
		category: "Mac Computers",
		quantity: 9,
		shipping: true,
	},
	{
		name: "Mac Studio XDR",
		slug: "mac-studio-xdr",
		description: "The best monitor every made!",
		price: 999,
		category: "Mac Computers",
		quantity: 6,
		shipping: true,
	},
	{
		name: "iPhone 67",
		slug: "iphone-67",
		description: "The best phone ever made!",
		price: 59,
		category: "iPhone Devices",
		quantity: 18,
		shipping: true,
	},
];

export const e2eUsers = {
	shopper: {
		name: "Playwright Shopper",
		email: "shopper67@example.com",
		password: "shopperPass123",
		phone: "90000001",
		address: "42 Test Arcade",
		answer: "swimming",
		role: 0,
	},
	admin: {
		name: "Playwright Admin",
		email: "admin.e2e@example.com",
		password: "adminPass123",
		phone: "90000002",
		address: "84 Test Arcade",
		answer: "tennis",
		role: 1,
	},
};

export const e2ePayment = {
	clientToken: "playwright-client-token",
	nonce: "fake-valid-nonce",
	transactionId: "playwright-transaction-id",
};
