
# ☁️ CloudLost — Cloud-Based Lost & Found System

CloudLost is a cloud-based lost-and-found web application that helps people report missing belongings, browse found items, and submit ownership claims.

The application uses Amazon Web Services (AWS) to provide secure authentication, cloud data storage, image uploads, serverless APIs, and administrator claim management.

## 🚀 Features

### User Features
- Browse reported lost and found items.
- Search and filter available items.
- Report lost or found belongings.
- Upload item photographs securely.
- Register and log in using Amazon Cognito.
- View detailed information about reported items.
- Submit ownership claims for found items.
- Provide an explanation to support an ownership claim.

### Administrator Features
- Access a dedicated Admin Dashboard.
- View all submitted ownership claims.
- Monitor total, pending, approved, and rejected claims.
- Review ownership explanations.
- Approve or reject pending claims.
- Automatically update item status when a claim is approved.
- Prevent regular users from performing administrator actions.

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| HTML5 | Website structure |
| CSS3 | Responsive user interface |
| JavaScript | Frontend functionality |
| AWS Lambda | Serverless backend functions |
| Amazon API Gateway | HTTP API endpoints |
| Amazon DynamoDB | NoSQL database |
| Amazon Cognito | Authentication and authorization |
| Amazon S3 | Private image storage |
| AWS IAM | Service permissions and access control |
| Node.js | Lambda runtime and development tooling |
| Jest | Automated JavaScript testing |
| Git and GitHub | Version control |

## ☁️ Cloud Architecture

CloudLost uses a serverless AWS architecture.

```text
                    CloudLost Website
                     HTML / CSS / JS
                            |
                            v
                    Amazon Cognito
                   User Authentication
                            |
                            v
                    Amazon API Gateway
                            |
                            v
                       AWS Lambda
                       /        \
                      v          v
               Amazon DynamoDB   Amazon S3
                Items & Claims   Item Images
```

### How It Works

1. A user opens the CloudLost website.
2. Amazon Cognito handles user authentication.
3. The frontend sends HTTP requests to Amazon API Gateway.
4. API Gateway invokes AWS Lambda functions.
5. Lambda functions validate requests and interact with DynamoDB or S3.
6. DynamoDB stores item reports and ownership claims.
7. S3 stores uploaded item photographs privately.
8. Administrators review claims using the Admin Dashboard.

## 🔐 Authentication and Security

CloudLost uses Amazon Cognito for user authentication.

- Users can register, log in, and log out.
- The frontend uses OAuth 2.0 Authorization Code Flow with PKCE.
- Protected API endpoints require a valid Cognito JWT.
- Administrator actions require membership in the `CloudLostAdmins` Cognito group.
- AWS Lambda performs administrator authorization checks.
- S3 blocks public access to stored images.
- Presigned URLs allow temporary access to uploaded photographs.
- AWS IAM policies control Lambda access to AWS resources.

The Admin Dashboard navigation link is displayed only to authenticated administrators. Backend authorization is enforced separately from frontend visibility.

## 🗄️ Database Design

CloudLost uses two DynamoDB tables.

### CloudLostItems

Stores information about lost and found belongings.

**Partition key:** `itemId` (String)

Example attributes:

| Attribute | Description |
|-----------|-------------|
| itemId | Unique item identifier |
| name | Item name |
| type | `lost` or `found` |
| location | Location associated with the report |
| status | Item status, such as `OPEN` or `CLAIMED` |
| imageKey | Optional S3 image key |

### CloudLostClaims

Stores ownership claims submitted by users.

**Partition key:** `claimId` (String)

| Attribute | Description |
|-----------|-------------|
| claimId | Unique claim identifier |
| itemId | Item being claimed |
| userId | Cognito user identifier |
| explanation | Ownership explanation |
| status | `PENDING`, `APPROVED`, or `REJECTED` |
| createdAt | Submission timestamp |
| reviewedAt | Optional review timestamp |
| reviewedBy | Optional administrator identifier |

## 🔌 API Endpoints

The backend uses an AWS API Gateway HTTP API.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/items` | Public | Retrieve reported items |
| POST | `/items` | Authenticated | Create an item report |
| POST | `/upload-url` | Authenticated | Request a presigned image upload URL |
| GET | `/image-url` | Public | Request a temporary image viewing URL |
| POST | `/claims` | Authenticated | Submit an ownership claim |
| GET | `/claims` | Administrator | Retrieve ownership claims |
| PATCH | `/claims/{claimId}` | Administrator | Approve or reject a claim |

Protected endpoints use Cognito JWT authentication. Administrator endpoints also check the user's Cognito group membership in Lambda.

## 📸 Image Uploads

CloudLost supports secure item photograph uploads.

1. An authenticated user selects an image.
2. The frontend requests a presigned upload URL.
3. AWS Lambda generates a temporary S3 upload URL.
4. The browser uploads the image directly to S3.
5. The item report stores the S3 object key in DynamoDB.
6. The application requests a temporary viewing URL when displaying the image.

Supported image formats:

- JPEG
- PNG
- WEBP

Maximum upload size: **5 MB**.

The S3 bucket is private and public access is blocked.

## 🛡️ Administrator Dashboard

The CloudLost Admin Dashboard provides a dedicated interface for managing ownership claims.

### Dashboard Statistics

Administrators can view:

- Total claims
- Pending claims
- Approved claims
- Rejected claims

### Claim Review

Administrators can inspect ownership explanations and approve or reject pending requests.

When a claim is approved:

1. The claim changes from `PENDING` to `APPROVED`.
2. The associated found item changes from `OPEN` to `CLAIMED`.
3. DynamoDB performs both updates in a transaction.
4. The dashboard refreshes the claims and statistics.

When a claim is rejected:

1. The claim changes from `PENDING` to `REJECTED`.
2. The item's status remains unchanged.
3. The dashboard refreshes the claims and statistics.

Conditional DynamoDB updates help prevent conflicting or repeated review decisions.

## 📁 Project Structure

```text
cloudlost/
├── index.html
├── items.html
├── report.html
├── item-details.html
├── admin.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── auth.js
│   └── admin.js
├── tests/
│   ├── app.test.js
│   └── auth.test.js
├── package.json
└── README.md
```

## 💻 Running the Application Locally

### Prerequisites

- Python 3
- Node.js and npm (for automated tests)
- A modern web browser

### 1. Clone the Repository

```bash
git clone https://github.com/KhensaneM/CloudLost.git
cd CloudLost
```

### 2. Start the Local Web Server

```bash
python3 -m http.server 8000
```

### 3. Open CloudLost

Visit:

http://localhost:8000

The frontend communicates with the configured AWS API Gateway deployment.

**Note:** Running the frontend locally does not deploy the AWS backend. The configured Cognito, API Gateway, Lambda, DynamoDB, S3, and IAM resources must already exist and be accessible.

## 🧪 Automated Testing

CloudLost uses Jest for JavaScript testing.

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Latest verified test results:

```text
Test Suites: 2 passed, 2 total
Tests:       29 passed, 29 total
Snapshots:   0 total
```

The application has also been manually tested for:

- Administrator claim approval
- Administrator claim rejection
- DynamoDB claim status updates
- DynamoDB item status updates after approval
- Cognito administrator access restrictions
- Responsive Admin Dashboard display

## 🎬 Showcase Demonstration

A suggested CloudLost demonstration:

1. Open the CloudLost homepage.
2. Browse reported lost and found items.
3. Show a reported item with its photograph.
4. Demonstrate user authentication.
5. Explain how users report belongings.
6. Show how an ownership claim is submitted.
7. Open the Admin Dashboard.
8. Explain the claim statistics and review process.
9. Demonstrate the existing approved showcase claim.
10. Explain how DynamoDB transactions maintain data consistency.

For a live approval or rejection demonstration, use temporary test records rather than modifying the preserved showcase claim.

## 🌍 Project Purpose

Lost belongings are often reported through scattered messages, noticeboards, or informal communication channels.

CloudLost provides a central platform where people can report items, search for belongings, and submit ownership claims.

By using serverless AWS services, the project demonstrates how cloud computing can support an accessible lost-and-found solution without requiring a traditional application server.

## 🔮 Future Improvements

Potential enhancements include:

- Email notifications for claim decisions.
- User claim-history pages.
- Advanced search and filtering.
- Pagination for large item and claim collections.
- Administrator audit logs.
- Automated deployment infrastructure.
- More comprehensive backend integration tests.

## 👩‍💻 Author

Developed by Khensane Makhalemele.

GitHub: https://github.com/KhensaneM

## 📄 License

No license has been specified for this repository.
```
