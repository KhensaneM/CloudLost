
import { randomUUID } from "node:crypto";

import {
    S3Client,
    PutObjectCommand
} from "@aws-sdk/client-s3";

import {
    getSignedUrl
} from "@aws-sdk/s3-request-presigner";

// AWS CONFIGURATION
const REGION = "eu-north-1";

const BUCKET_NAME = "cloudlost-item-images-khensane";

const s3 = new S3Client({
    region: REGION
});

// Supported image formats
const allowedTypes = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
};

// Maximum upload size: 5 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// LAMBDA HANDLER
export const handler = async (event) => {

    try {
        const body = JSON.parse(event.body || "{}");

        const contentType = body.contentType;
        const fileSize = body.fileSize;

        // Validate image type
        if (!Object.hasOwn(allowedTypes, contentType)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Unsupported image type"
                })
            };
        }

        // Validate declared file size
        if (
            fileSize !== undefined &&
            (
                !Number.isInteger(fileSize) ||
                fileSize <= 0 ||
                fileSize > MAX_FILE_SIZE
            )
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid image size. Maximum is 5 MB."
                })
            };
        }

        // Generate a unique filename
        const imageKey =
            `images/${randomUUID()}.${allowedTypes[contentType]}`;

        // Prepare the S3 upload request
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: imageKey,
            ContentType: contentType
        });

        // Generate a temporary upload URL
        const uploadUrl = await getSignedUrl(
            s3,
            command,
            {
                expiresIn: 300
            }
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Upload URL generated successfully",
                uploadUrl: uploadUrl,
                imageKey: imageKey
            })
        };

    } catch (error) {

        console.error("Image upload error:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Unable to generate image upload URL"
            })
        };
    }
};


