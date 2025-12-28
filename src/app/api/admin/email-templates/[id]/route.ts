import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import EmailTemplate from '@/infrastructure/database/models/EmailTemplate';
import { getAdminSession } from '@/domains/auth/services/auth.service';

// GET - Get single email template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connect();
    const { id } = await params;
    const template = await EmailTemplate.findById(id);

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Get email template error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch email template' },
      { status: 500 }
    );
  }
}

// PUT - Update email template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connect();
    const { id } = await params;
    const body = await request.json();
    const { name, subject, htmlContent, description, variables, isActive } = body;

    const template = await EmailTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (name !== undefined) template.name = name;
    if (subject !== undefined) template.subject = subject;
    if (htmlContent !== undefined) template.htmlContent = htmlContent;
    if (description !== undefined) template.description = description;
    if (variables !== undefined) template.variables = variables;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();

    return NextResponse.json({
      success: true,
      message: 'Email template updated successfully',
      template,
    });
  } catch (error: any) {
    console.error('Update email template error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update email template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete email template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connect();
    const { id } = await params;
    const template = await EmailTemplate.findByIdAndDelete(id);

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete email template error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete email template' },
      { status: 500 }
    );
  }
}
