import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { uploadFile, getStoragePath } from '@/lib/supabase';
import { generatePDFFromImages, validateImage, optimizeImage } from '@/lib/pdfGenerator';
import { extractTextFromImages, cleanOCRText } from '@/lib/ocrProcessor';

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Maximum image size (5MB per image)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Maximum number of images per upload
const MAX_IMAGES = 20;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based case access verification
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = {
      id: caseId,
      firmId: user.firmId,
      ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
    };

    const caseRecord = await prisma.case.findFirst({
      where: caseFilter,
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const documentName = formData.get('documentName') as string | null;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images allowed per upload` },
        { status: 400 }
      );
    }

    // Validate and process images
    const imageBuffers: Buffer[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Validate size
      if (image.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Image ${i + 1} exceeds maximum size of 5MB` },
          { status: 400 }
        );
      }

      // Validate type
      if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
        return NextResponse.json(
          { error: `Image ${i + 1} has invalid type. Allowed: JPEG, PNG, WebP` },
          { status: 400 }
        );
      }

      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate it's actually a valid image
      const isValid = await validateImage(buffer);
      if (!isValid) {
        return NextResponse.json(
          { error: `Image ${i + 1} is corrupted or invalid` },
          { status: 400 }
        );
      }

      imageBuffers.push(buffer);
    }

    console.log(`Processing ${imageBuffers.length} images for case ${caseId}...`);

    // Step 1: Optimize images
    console.log('Optimizing images...');
    const optimizedBuffers: Buffer[] = [];
    for (const buffer of imageBuffers) {
      const optimized = await optimizeImage(buffer);
      optimizedBuffers.push(optimized);
    }

    // Step 2: Run OCR on all images
    console.log('Running OCR...');
    const ocrResult = await extractTextFromImages(optimizedBuffers);
    const extractedText = cleanOCRText(ocrResult.combinedText);
    console.log(`OCR completed. Average confidence: ${ocrResult.averageConfidence.toFixed(1)}%`);

    // Step 3: Generate PDF from images
    console.log('Generating PDF...');
    const pdfResult = await generatePDFFromImages(
      optimizedBuffers.map(buffer => ({
        buffer,
        mimeType: 'image/jpeg', // All images converted to JPEG by optimizer
      }))
    );

    // Step 4: Upload PDF to Supabase
    const timestamp = Date.now();
    const fileName = documentName
      ? `${documentName.replace(/[^a-zA-Z0-9._\s-]/g, '')}.pdf`
      : `scanned-document-${timestamp}.pdf`;

    const storagePath = getStoragePath(caseId, fileName);

    console.log('Uploading PDF to storage...');
    const uploadResult = await uploadFile(storagePath, pdfResult.pdfBuffer, 'application/pdf');

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: `Failed to upload PDF: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    // Step 5: Save document record to database
    // Note: extractedText will be stored once the database schema is updated
    const fileDoc = await prisma.fileDocument.create({
      data: {
        caseId,
        fileName,
        fileUrl: storagePath,
        fileType: 'application/pdf',
        fileSize: pdfResult.pdfBuffer.length,
        // extractedText: extractedText || null, // TODO: Add after schema migration
      },
    });

    // Log OCR result for now (will be stored in DB after migration)
    if (extractedText) {
      console.log(`OCR extracted ${extractedText.length} characters from document`);
    }

    console.log(`Document created: ${fileDoc.id}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Document created successfully',
        document: {
          id: fileDoc.id,
          fileName: fileDoc.fileName,
          fileSize: fileDoc.fileSize,
          pageCount: pdfResult.pageCount,
          hasExtractedText: !!extractedText,
          ocrConfidence: ocrResult.averageConfidence,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing images:', error);
    return NextResponse.json(
      { error: 'Failed to process images. Please try again.' },
      { status: 500 }
    );
  }
}
