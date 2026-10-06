# HomeVault - Cloud Storage App

## Run
    npm install
    npm start        # http://localhost:3000

First account you register becomes **Admin**. Set JWT_SECRET in production.

## API
POST /api/register, /api/login | GET /api/files?view=mine|shared|all|trash
POST /api/upload (multipart: files, shared) | GET /api/files/:id/download
PATCH /api/files/:id {trash|shared} | DELETE /api/files/:id

## Real cloud storage
Replace multer.diskStorage in server.js with multer-s3 (AWS S3) or Firebase Admin Storage.
