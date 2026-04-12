# CS4218 Project - Virtual Vault

## Table of Contents

- [1. Project Introduction](#1-project-introduction)
- [2. Website Features](#2-website-features)
- [3. Your Task](#3-your-task)
- [4. Setting Up The Project](#4-setting-up-the-project)
- [5. Unit Testing with Jest](#5-unit-testing-with-jest)
- [6. Who Handled What](#6-who-handled-what)
    - [Lim Jia Wei (A0277381W)](#lim-jia-wei-a0277381w)
    - [Muhammad Zaidan bin Sani (A0273278U)](#muhammad-zaidan-bin-sani-a0273278u)
    - [Nicholas Cheng De Fei (A0269648H)](#nicholas-cheng-de-fei-a0269648h)
    - [Rachel Tai Ke Jia (A0258603A)](#rachel-tai-ke-jia-a0258603a)
    - [Wong Sheen Kerr (A0269647J)](#wong-sheen-kerr-a0269647j)
- [7. MS1 CI URL](#7-ms1-ci-url)
- [8. AI-driven Testing](#8-ai-driven-testing)
    - [Stagehand-assisted Natural Language UI test case generation](#stagehand-assisted-natural-language-ui-test-case-generation)
    - [LLM-powered Metamorphic Test Generation](#llm-powered-metamorphic-test-generation)
    - [White-Box LLM Vulnerability Scanner](#white-box-llm-vulnerability-scanner)
    - [LLM-powered Test Metric Requirements Calculation ](#llm-powered-test-metric-requirements-calculation)

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:
    - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
    - Open your terminal and check the installed versions of Node.js and npm:
        ```bash
        node -v
        npm -v
        ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:
    - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:
    - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
    - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:
    - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
    - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:
    - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
    - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:
    - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
    - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
    - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**
    - Go to the GitHub repository of the MERN app.
    - Click on the "Code" button and copy the URL of the repository.
    - Open your terminal or command prompt.
    - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
        ```bash
        git clone <repository_url>
        ```
    - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**
    - Run the following command in your project's root directory:

        ```
        npm install && cd client && npm install && cd ..
        ```

3. **Add database connection string to `.env`**
    - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
        ```env
        MONGO_URL = <connection string>
        ```

4. **Adding sample data to database**
    - Download “Sample DB Schema” from Canvas and extract it.
    - In MongoDB Compass, create a database named `test` under your cluster.
    - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
    - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
    - Open your web browser.
    - Use `npm run dev` to run the app from root directory, which starts the development server.
    - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

    ```bash
    npm install --save-dev jest

    ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:
    - **Frontend tests**

        ```bash
        npm run test:frontend
        ```

    - **Backend tests**

        ```bash
        npm run test:backend
        ```

    - **All the tests**
        ```bash
        npm run test
        ```

## 6. Who Handled What

### Lim Jia Wei (A0277381W)

#### Milestone 1 Unit Test

I was responsible for testing the following components:

**Server Files:**

- `controllers/authController.js`
    - `getUsersController` - New function

- `config/db.js `
- `models/userModel.js`

**Client Files:**

- `components/AdminMenu.js`
- `components/Form/CategoryForm.js`

- `pages/admin/AdminDashboard.js`
- `pages/admin/CreateCategory.js`
- `pages/admin/CreateProduct.js`
- `pages/admin/UpdateProduct.js`
- `pages/admin/AdminOrders.js`
- `pages/admin/Products.js`
- `pages/admin/Users.js`

For **milestone 1**, I unit tested all files specified above with the exception of `userModel.js` due to it being left for integration testing. (_more information can be seen in the MS1 report_).

#### Milestone 2 Integration & E2E UI Tests

I am responsible for testing the following components:

- Admin Dashboard & Routing Components
    - `components/AdminMenu.js`
    - `components/AdminRoute.js`

- Admin Management Pages (Products, Categories, Orders, Users)
    - `pages/admin/AdminOrders.js`
    - `pages/admin/CreateCategory.js`
    - `pages/admin/CreateProduct.js`
    - `pages/admin/Products.js`
    - `pages/admin/UpdateProduct.js`
    - `pages/admin/Users.js`

- Static Pages:
    - `pages/About.js`
    - `pages/Contact.js`
    - `pages/Pagenotfound.js`
    - `pages/Policy.js`

- Authentication & Context Providers:
  - `context/auth.js`
  - `context/cart.js`
  - `context/search.js`
  - `pages/Auth/Login.js`

- E2E UI Flows:
    - Encounter a payment failure or rejection from the gateway (Cart & Checkout Flow)
    - Filter products by selecting checkboxes for specific categories (Main Browsing & Filtering Flow)
    - Submit the registration form with all required and valid details (Registration Flow)
    - Enter a valid search term and see the corresponding product results (Search Flow)
    - Load an existing product into the update form and modify details like price and description (Update Product Flow)
    - View the list of registered accounts on the users page as an admin (Admin User Management Flow)

After receiving milestone 1 feedback, in milestone 2, I corrected issues such as the lack of unit tests for the `userModel` as well as a typo where the unit test claimed to test logging when it in fact did not.

#### Milestone 3 Non-Functional Tests & AI Driven Testing

For **milestone 3**, I utilized k6 to develop my assigned spike tests which cover the following flows, Authentication(Register and Login), Payment and Search. Corresponding reports generated by k6 have been included in the same directory as the tests.

The tests can be found in the directory “/tests/nft/spike-testing”:

- `auth_spike.js`  
- `braintree_payment_spike.js`  
- `search_spike.js`

For the AI-driven testing component, I was assigned to develop the test metrics feature which generates test case requirements according to the specifications of said test metric. It was decided that multiple condition coverage would be focused on. To develop this feature, I created a script which takes in a file name as a parameter and runs that file through a Gemini LLM to both extract branch conditions as well as generate the final test requirement report (in pdf format). 

A `readme.md` file has been included in the same directory for easier setup.

### Muhammad Zaidan bin Sani (A0273278U)

I am responsible for testing the following components:
**Unit Tests**

- Product CRUD
    - `controllers/productController`
        - `createProductController`
        - `deleteProductController`
        - `updateProductController`
        - `getProductController`
        - `getSingleProductController`
        - `productPhotoController`
- Product filters
    - `controllers/productController`
        - `productFiltersController`
        - `productCountController`
        - `productListController`
        - `searchProductController`
        - `relatedProductsController`
        - `productCategoryController`
- Product model
  - `models/productModel`

**Integration tests**

- Product integrations
    - Integration with Model and DB
    - Integration with Auth middleware, Formidable etc.
- Order integration - Integration with Model and DB - Integration with Auth middleware

**E2E tests**

- Product creation with admin
- Category > Product creation with admin
- Related product viewing
- Authentication flow tests

**Security Testing**

- IDOR vulnerabilities
- MongoDB Injection
- Price and Checkout Tampering
- Session Replay attacks

#### Milestone 1 Unit Test

For **milestone 1**, I unit tested every function seen under Product CRUD and product filters above, and left the product model for integration testing (_more information can be seen in the MS1 report_).

#### Milestone 2 Integration & E2E UI Tests

I am responsible for testing the following components:

**Integration Scopes:**
- Profile Management:
  - `client/src/pages/user/Profile.js`
  - `context/auth.js`
  - `routes/authRoute.js`
  - `middlewares/authMiddleware.js`
  - `controllers/authController.js` → `updateProfileController`
  - `helpers/authHelper.js`
  - `models/userModel.js`
- Cart Full Flow:
  - `pages/HomePage.js`
  - `pages/CartPage.js`
  - `context/cart.js`
  - `components/Header.js`
  - browser localStorage
- Search Flow:
  - `components/Form/SearchInput.js`
  - `components/Header.js`
  - `pages/Search.js`
  - `context/search.js`
  - `routes/productRoutes.js`
  - `controllers/productController.js` → `searchProductController`
  - `models/productModel.js`
- Browsing + Filtering:
  - `pages/HomePage.js`
  - `components/Prices.js`
  - `routes/productRoutes.js`
  - `controllers/productController.js` → `productFiltersController`
  - `productListController`
  - `productCountController`
  - `models/productModel.js`
  - `models/categoryModel.js`

**E2E UI Flows:**
- Filter products by price range on the home page *(Main Browsing & Filtering)*
- View product details, price, category, and images on ProductDetails *(Product Viewing Flow)*
- Search for a product and click through to its detail page *(Search Flow)*
- Reset forgotten password and log in with new password *(Password Recovery Flow)*
- Attempt to register with an already-registered email *(Registration Flow)*
- Delete a product from the Update Product page *(Delete Product Flow)*

For the integration tests, I used a combination of top-down and bottom-up incremental approaches depending on the scope. For the search flow, I used a top-down approach, beginning with SearchInput and SearchContext with a stubbed API, then incrementally adding Header navigation, the Search results page, and finally replacing the stub with a live backend call against a real test database. For the cart flow, I started from the top with HomePage integrating into CartContext, and separately from the bottom with CartPage reading from localStorage. 

For the E2E UI tests, I used Playwright to simulate complete user journeys across six flows, covering both success paths and an error and edge cases, with MongoDB seeded directly before each run to keep tests deterministic and repeatable. 

#### Milestone 3 Non-Functional Tests

For **milestone 3**, I added tests to check for IDOR (Insecure Direct Object References) vulnerabilities, MongoDB Injection, price & checkout tampering as well as session replay. I fixed a few bugs relating to input validation to fix the security vulnerabilities found.

In addition, I used a white-box LLM-powered vulnerability scanner to find more vulnerabilities in the system.

(*more information can be seen in the MS3 report*).

### Nicholas Cheng De Fei (A0269648H)

#### Milestone 1 Unit Test

I am responsible for testing the following components:

_Server Files:_

- Category CRUD (_controllers/categoryController\.js_):
    - `createCategoryController`
    - `updateCategoryController`
    - `deleteCategoryController`
    - `categoryControlller`
    - `singleCategoryController`

- Payment (_controllers/productController\.js_):
    - `braintreeTokenController`
    - `brainTreePaymentController`

- Orders CRUD (_controllers/authController\.js_):
    - `getOrdersController`
    - `getAllOrdersController`
    - `orderStatusController`

- Models:
    - `models/categoryModel\.js`
    - `models/orderModel\.js`

_Client Files:_

- `hooks/useCategory\.js`
- `pages/Categories\.js`

For **milestone 1**, I have done unit test for all components.

#### Milestone 2 Integration & E2E UI Tests

I am responsible for testing the following components:

- Category CRUD (_controllers/categoryController\.js_):
    - `createCategoryController`
    - `updateCategoryController`
    - `deleteCategoryController`
    - `categoryControlller`
    - `singleCategoryController`

- Payment (_controllers/productController\.js_):
    - `braintreeTokenController`
    - `brainTreePaymentController`

- Models:
    - `models/categoryModel\.js`
    - `models/orderModel\.js`

- E2E UI Flows:
    - Attempt to login with an unregistered email (_Login Flow_)
    - Attempting checkout without being logged in (_Cart & Checkout Flow_)
    - Navigate to a specific category page (`CategoryProduct`) and view only products from that category (_Category Browsing Flow_)
    - Attempt to submit the form without uploading a photo or missing a required field (_Create Product Flow_)
    - Attempt to login with an incorrect password _Login Flow_)
    - Use the "Load More" button to fetch additional products (_pagination_)
    - Navigating to a product slug that does not exist or has been deleted (_fallback handling, Product Viewing Flow)_

For **milestone 2**, the first thing I did was to correct the issues that were feedback to me in milestone 1, for instance typos and also to do unit test for the `Models`.

Afterwards I did integraton tests for the category CRUD and the various payment using a bottom up incremental approach. I started with the lower level components like the controller, database / models and external components like Braintree. Afterwards I integrate the higher level components like the Express router, and authtentication middleware.

As for the E2E UI tests I used Playwright to write and generate the various test cases for the assigned flows.

#### Milestone 3 Non-Functional Tests & AI Driven Testing

For **milestone 3**, I used k6 to execute my stress tests on the following components, login, register, search & payment which I deemed to be a key functionality of the e-commerce website.

The tests can be found in this file directory “/tests/nft/stress-tests”:

- `login.js`  
- `register.js`  
- `search.js`  
- `payment.js`

As for the AI driven testing I was assigned to develop an AI tool to help with metamorphic testing. To develop this tool I did the following:

- Create a script to index the code base  
- Develop a relations agent which will do a lookup on the relevant functions using the indexed codebase & generate the relevant metamorphic relationships  
- Develop a test generation agent which will based on the source code and the metamorphic relations, generate a test suit using Jest

A `README.md` file has been included in this file directory "/ai/metamorphic-testing" which contains instructions to setup the tool for use.

### Rachel Tai Ke Jia (A0258603A)

#### Milestone 1 Unit Test

I am responsible for unit testing frontend components, context providers, and one backend controller:

- General Components and Pages
    - `components/Footer.js`
    - `components/Header.js`
    - `components/Layout.js`
    - `components/Spinner.js`
    - `pages/About.js`
    - `pages/Pagenotfound.js`
    - `pages/Contact.js`
    - `pages/Policy.js`
- Search, Product, Cart, and Home
    - `components/Form/SearchInput.js`
    - `context/search.js`
    - `pages/Search.js`
    - `pages/ProductDetails.js`
    - `pages/CategoryProduct.js`
    - `context/cart.js`
    - `pages/CartPage.js`
    - `pages/Homepage.js`
- User, Dashboard, Orders, Profile, and Auth Controller:
    - `components/UserMenu.js`
    - `pages/user/Dashboard.js`
    - `pages/user/Orders.js`
    - `pages/user/Profile.js`
    - `controllers/authController.js` (specifically `updateProfileController`)
 
For **milestone 1**, I have done unit tests for all client components (pages, context, components) (_more information can be seen in the MS1 report_).


#### Milestone 2 Integration & E2E UI Tests

I am responsible for testing the following components:

**Integration Scopes:**
- Profile Management:
  - `client/src/pages/user/Profile.js`
  - `context/auth.js`
  - `routes/authRoute.js`
  - `middlewares/authMiddleware.js`
  - `controllers/authController.js` → `updateProfileController`
  - `helpers/authHelper.js`
  - `models/userModel.js`
- Cart Full Flow:
  - `pages/HomePage.js`
  - `pages/CartPage.js`
  - `context/cart.js`
  - `components/Header.js`
  - browser localStorage
- Search Flow:
  - `components/Form/SearchInput.js`
  - `components/Header.js`
  - `pages/Search.js`
  - `context/search.js`
  - `routes/productRoutes.js`
  - `controllers/productController.js` → `searchProductController`
  - `models/productModel.js`
- Browsing + Filtering:
  - `pages/HomePage.js`
  - `components/Prices.js`
  - `routes/productRoutes.js`
  - `controllers/productController.js` → `productFiltersController`
  - `productListController`
  - `productCountController`
  - `models/productModel.js`
  - `models/categoryModel.js`

**E2E UI Flows:**
- Filter products by price range on the home page *(Main Browsing & Filtering)*
- View product details, price, category, and images on ProductDetails *(Product Viewing Flow)*
- Search for a product and click through to its detail page *(Search Flow)*
- Reset forgotten password and log in with new password *(Password Recovery Flow)*
- Attempt to register with an already-registered email *(Registration Flow)*
- Delete a product from the Update Product page *(Delete Product Flow)*

For the integration tests, I used a combination of top-down and bottom-up incremental approaches depending on the scope. For the search flow, I used a top-down approach, beginning with SearchInput and SearchContext with a stubbed API, then incrementally adding Header navigation, the Search results page, and finally replacing the stub with a live backend call against a real test database. For the cart flow, I started from the top with HomePage integrating into CartContext, and separately from the bottom with CartPage reading from localStorage. 

For the E2E UI tests, I used Playwright to simulate complete user journeys across six flows, covering both success paths and an error and edge cases, with MongoDB seeded directly before each run to keep tests deterministic and repeatable.

#### Milestone 3 Non-Functional Testing

I am responsible for the load testing setup using JMeter under `tests/nft/load-testing`, covering the main non-functional flows of the ecommerce platform:

- **Product browsing flow** for catalog, category, search, price filter, and pagination endpoints: 
    - [product-browsing-flow.jmx](tests/nft/load-testing/jmeter/product-browsing-flow.jmx) 
    - [run-browsing-load.sh](tests/nft/load-testing/scripts/run-browsing-load.sh) 
- **Search and filter flow** for category bootstrap, keyword search, and combined category-and-price filtering: 
    - [search-filter-flow.jmx](tests/nft/load-testing/jmeter/search-filter-flow.jmx) 
    - [run-search-filter-load.sh](tests/nft/load-testing/scripts/run-search-filter-load.sh) 
- **Authentication flow** for register, login, and token validation
    - [authentication-flow.jmx](tests/nft/load-testing/jmeter/authentication-flow.jmx) 
    - [run-auth-load.sh](tests/nft/load-testing/scripts/run-auth-load.sh)
- **Order checkout flow** for login, braintree token, payment submission, and order retrieval validation: 
    - [order-checkout-flow.jmx](tests/nft/load-testing/jmeter/order-checkout-flow.jmx) 
    - [run-order-load.sh](tests/nft/load-testing/scripts/run-order-load.sh) 
- **Product detail flow** for viewing details of a single product:
    - [product-detail-flow.jmx](tests/nft/load-testing/jmeter/product-detail-flow.jmx)
    - [run-product-detail-load.sh](tests/nft/load-testing/scripts/run-product-detail-load.sh)

The purpose of load testing was to simulate expected day-to-day traffic, measure response time, throughput, and error rate, and identify bottlenecks under concurrent usage. Two independent load-testing profiles were defined so the results could be interpreted from both a controlled benchmark view and a realistic funnel-based view.

The first profile is a uniform baseline of 100 users per flow. This profile is useful for comparing flows under the same concurrency level and for exposing relative performance differences without traffic-distribution bias. The second profile reflects expected day-to-day usage based on the e-commerce funnel and assigns different load levels to each flow:

| Flow | Profile 1: Uniform Baseline | Profile 2: Funnel-Based Expected Load |
| --- | ---: | ---: |
| Product Browsing | 100 | 100 |
| Product Detail | 100 | 60 |
| Search & Filter | 100 | 40 |
| Authentication | 100 | 15 |
| Order Checkout | 100 | 5 |

The funnel-based profile is justified by typical conversion behavior: browsing sits at the top of the funnel, search and product detail are used by a smaller subset of visitors, authentication is a low-frequency session action, and checkout is the smallest but most critical transaction stage. 

Each flow is tested independently under its selected load profile, with a 60-second ramp-up, 3 iterations per user, and a 900-second maximum duration. Each `.jmx` file defines a JMeter test plan for one flow. Each matching `.sh` script runs the test plan with its configured load profile and exports JTL and HTML report outputs. I also added `run-all-load.sh` to execute all flows in sequence and `analyze-jtl.mjs` to summarize response time, throughput, and error rate from the generated JTL files. The analyzer applies the flow thresholds based on the generated JTL filename, so each runner output is checked against the correct browsing, product detail, search & filter, authentication, or order & payment limits.


### Wong Sheen Kerr (A0269647J)

### Wong Sheen Kerr (A0269647J)

I am in charge of the unit testing for the authentication module across both the backend and frontend, namely:

**Server Files:**

- `helpers/authHelper.js` (2 functions: `hashPassword`, `comparePassword`)
- `middlewares/authMiddleware.js` (2 functions: `requireSignIn`, `isAdmin`)
- `controllers/authController.js` – Auth functions only:
    - `registerController`
    - `loginController`
    - `forgotPasswordController`
    - `testController`

**Client Files:**

- `context/auth.js`
- `components/Routes/Private.js`
- `components/Routes/AdminRoute.js`
- `pages/Auth/Register.js`
- `pages/Auth/Login.js`
- `pages/Auth/ForgotPassword.js` – New file I added

#### Milestone 1 Unit Test

For **milestone 1**, I have done unit test for all components under Authentication (_more information can be seen in the MS1 report_).

#### Milestone 2 Integration & E2E UI Tests

I am responsible for testing the following components:
 **Authentication Integration** (_tests/integration/auth/authIntegration.test.js_):
    - Controllers & Routes: `registerController`, `loginController`, `forgotPasswordController`
    - Middlewares: `requireSignIn`, `isAdmin`
    - Models & Helpers: `userModel`, `hashPassword`, `comparePassword`

**E2E UI Flows** (using Playwright):
    - **Auth Flows** (_tests/e2e/authFlows.spec.js_): Registration logic, password recovery processes, form validation, and error handling.
    - **Cart & Product Flows** (_tests/e2e/cartAndProduct.spec.js_): Browsing products on the homepage, viewing product details, adding/removing items from the cart, observing guest cart states, and completing the authenticated checkout process.
    - **Search & Filtering Flows** (_tests/e2e/searchAndFilter.spec.js_): Handling search edge case (e.g., no products found), applying category and price filters, and resetting filters.

### Milestone 3 Non-Functional Tests

I implemented an API-level **Soak/Endurance testing** suite for the main shopper workflows using `k6`. The suite tests long-running system stability under a mixed workload made up of:

- catalog browsing  
- auth/session  
- search/filter  
- checkout/orders

Files added:

- `tests/nft/soak/helpers.js` Shared soak-test setup, reset-route data preparation, fixed VU allocation, and summary output.  
- `tests/nft/soak/scenarios.js` The individual shopper workflow scenarios used during the soak run.  
- `tests/nft/soak/soak.k6.js` Main k6 entrypoint for the endurance test suite.  
- `tests/nft/soak/run-soak.ps1` Windows runner script for launching the soak test and exporting CSV results.  
- `tests/nft/soak/monitor-process-memory.ps1` Optional process-level memory monitor for collecting backend memory usage during long runs.  
- `tests/nft/soak/README.md` Usage notes and instructions for running the soak tests.  
- `tests/nft/soak/analyze_k6_results.py` Analyzer for the soak tests result CSV and matching process-memory CSV. It summarizes overall, per-scenario, per-window, failure, and memory-growth statistics into a JSON file.  
- `tests/nft/soak/soak-20260408-205833-summary.json` JSON summary output of my 14 hours soak test run.

What I did:

- designed and implemented the soak/endurance test workflows  
- configured the suite to run the 4 scenarios concurrently as a mixed workload  
- used the existing reset route so each run starts with the same shopper, products, categories, and fake payment setup  
- ran a \~14 hour+ soak testing and collected [CSV-based performance results](https://drive.google.com/drive/folders/1xlbKnMzNcM-F2xSUkU0uP9nyn12aTigt?usp=sharing)  
- collected backend process memory during the soak run to check for memory leak.

## 7. MS1 CI URL

**CI URL**: https://github.com/cs4218/cs4218-2520-ecom-project-c24218-2520-team01/actions/runs/22282001657

## 8. AI-driven Testing

### Stagehand-assisted Natural Language UI test case generation

Natural Language prompt driven UI testing (with guardrails to reduce hallucinations) to generate UI Tests with Stagehand. Generated stagehand test files can be easily replayed for future use.

### LLM-powered Metamorphic Test Generation

**Scope and Components:**
- Metamorphic pipeline orchestration:
  - `ai/metamorphic-testing/main.py`
- Codebase indexing and retrieval preparation:
  - `ai/metamorphic-testing/scripts/indexer.js`
  - `ai/metamorphic-testing/scripts/codebase-index.json`
- Relation generation agent:
  - `ai/metamorphic-testing/agent/relations_agent.py`
- Test synthesis agent:
  - `ai/metamorphic-testing/agent/mr_test_generation_agent.py`
- Structured output contracts:
  - `ai/metamorphic-testing/models/structured_response.py`
- Generated artifacts:
  - `ai/metamorphic-testing/output/*.test.js`
- Test configuration:
  - `ai/metamorphic-testing/jest.generated.config.cjs`

**What was done:**
- Refined a two-stage agent workflow:
  - Stage 1: Generate metamorphic relations from source code context.
  - Stage 2: Generate Jest tests from the relations and save them automatically.
- Added deterministic preflight validation mode (`--validate`) to verify index lookup and source extraction without LLM calls.
- Improved indexer path handling to be script-relative, so indexing works reliably regardless of current working directory.
- Added robust fallback handling in the relations agent when native structured output fails:
    - strict JSON fallback prompt
    - JSON block extraction from model text output
    - Pydantic validation before downstream use
- Added clearer pipeline logging (stage progress and timing) to make execution and debugging observable.
- Added Jest configuration to run generated tests in fully autonomouse mode or semi-autonomous mode
    - Fully autonomous mode: AI generates relations and tests, then tests are executed directly.
    - Semi-autonomous mode: AI proposes relations/tests first, then humans review or refine before execution.

### White-Box LLM Vulnerability Scanner

Utilising a white-box LLM vulnerability scanner that helped to identify possible exploits and try those exploits with agentic AI.

### LLM-powered Test Metric Requirements Calculation

Utilising LLMs to generate test cases for complex test metrics such as multiple condition coverage. 

More details about what was done can be found in the report and the `ai` folder  
