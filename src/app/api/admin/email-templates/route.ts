import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import EmailTemplate from '@/infrastructure/database/models/EmailTemplate';
import { getAdminSession } from '@/domains/auth/services/auth.service';

// GET - List all email templates
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connect();
    const templates = await EmailTemplate.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('Get email templates error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

// POST - Create new email template
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connect();
    const body = await request.json();
    const { name, slug, subject, htmlContent, description, variables } = body;

    if (!name || !slug || !subject || !htmlContent) {
      return NextResponse.json(
        { success: false, message: 'Name, slug, subject, and HTML content are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await EmailTemplate.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'A template with this slug already exists' },
        { status: 400 }
      );
    }

    const template = await EmailTemplate.create({
      name,
      slug: slug.toLowerCase(),
      subject,
      htmlContent,
      description,
      variables: variables || [],
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Email template created successfully',
      template,
    });
  } catch (error: any) {
    console.error('Create email template error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create email template' },
      { status: 500 }
    );
  }
}
