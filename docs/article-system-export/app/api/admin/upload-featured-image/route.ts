import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'yorkshire-2026-assets-uk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  // Check auth - only admins/editors can upload
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be less than 5MB' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const uniqueId = crypto.randomUUID();
    const s3Key = `articles/featured/${uniqueId}.${ext}`;

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read',
    }));

    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-west-2'}.amazonaws.com/${s3Key}`;

    // Generate AI alt text using GPT-4o Vision
    let altText = '';
    let aiGeneratedFilename = '';

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are writing alt text and a descriptive filename for a featured image on a Yorkshire tourism blog.

1. Alt Text Requirements:
   - Be descriptive and specific (what's in the image)
   - Maximum 125 characters
   - Don't start with "image of", "photo of", or "picture of"
   - Focus on visual elements: landscape, architecture, people, atmosphere
   - Example: "Stone Victorian hotel building with turrets overlooking city walls"

2. Filename Requirements:
   - Descriptive, SEO-friendly filename
   - Use hyphens between words
   - Lowercase only
   - Maximum 60 characters
   - Include relevant keywords (place, subject, type)
   - Example: "york-minster-gothic-cathedral-exterior.jpg"

Respond in JSON format:
{
  "altText": "your alt text here",
  "filename": "your-filename-here.${ext}"
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low', // Cost savings
                },
              },
            ],
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
      altText = aiResponse.altText || '';
      aiGeneratedFilename = aiResponse.filename || '';
    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      // Fallback to basic alt text
      altText = 'Featured image for article';
      aiGeneratedFilename = file.name;
    }

    // Save to entity_image table for the media library
    const entityImage = await prisma.entity_image.create({
      data: {
        image_url: imageUrl,
        alt_text: altText,
        caption: altText, // Use alt text as initial caption
        source: 'upload',
        ai_analyzed: true,
        ai_analyzed_at: new Date(),
      },
    });

    return NextResponse.json({
      url: imageUrl,
      altText,
      title: altText, // Use alt text as default title
      filename: aiGeneratedFilename,
      imageId: entityImage.image_id, // Return the image ID for tracking
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
