"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Plus, Edit, Trash2, Search, Mail, Eye, Copy, Save, Wand2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { toast } from "sonner";
import { useConfirmationDialog } from "@/shared/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";

interface EmailTemplate {
  _id: string;
  name: string;
  slug: string;
  subject: string;
  htmlContent: string;
  description?: string;
  isActive: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

// Auto-generate HTML template based on type
const generateEmailHtml = (type: string, title: string, content: string, buttonText?: string) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">${title}</h2>
              ${content}
              ${buttonText ? `<a href="#" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px;">${buttonText}</a>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© ${new Date().getFullYear()} NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const TEMPLATE_PRESETS = [
  {
    name: "Welcome Email",
    slug: "welcome",
    subject: "Welcome to NalmiFX, {{name}}!",
    description: "Sent when a new user successfully registers",
    variables: ["name", "email", "userId"],
    htmlContent: generateEmailHtml(
      "welcome",
      "Welcome, {{name}}!",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Thank you for joining NalmiFX. Your account has been created successfully.</p>
      <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Email:</strong> {{email}}</p>
        <p style="margin: 0; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">User ID:</strong> {{userId}}</p>
      </div>
      <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Start your trading journey today and explore our powerful trading tools.</p>`,
      "Get Started"
    ),
  },
  {
    name: "Deposit Successful",
    slug: "deposit-success",
    subject: "Deposit Confirmed - ${{amount}}",
    description: "Sent when a user's deposit is approved",
    variables: ["name", "amount", "transactionId", "date"],
    htmlContent: generateEmailHtml(
      "deposit",
      "Deposit Confirmed!",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, your deposit has been successfully processed.</p>
      <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Amount:</strong> <span style="color: #22c55e; font-size: 18px; font-weight: bold;">$\{{amount}}</span></p>
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Transaction ID:</strong> {{transactionId}}</p>
        <p style="margin: 0; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Date:</strong> {{date}}</p>
      </div>
      <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your funds are now available in your trading account.</p>`,
      "View Account"
    ),
  },
  {
    name: "Withdrawal Approved",
    slug: "withdrawal-approved",
    subject: "Withdrawal Approved - ${{amount}}",
    description: "Sent when a user's withdrawal is approved",
    variables: ["name", "amount", "transactionId", "date"],
    htmlContent: generateEmailHtml(
      "withdrawal",
      "Withdrawal Approved!",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, your withdrawal request has been approved.</p>
      <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Amount:</strong> <span style="color: #a855f7; font-size: 18px; font-weight: bold;">$\{{amount}}</span></p>
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Transaction ID:</strong> {{transactionId}}</p>
        <p style="margin: 0; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Date:</strong> {{date}}</p>
      </div>
      <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Funds will be transferred to your account within 1-3 business days.</p>`
    ),
  },
  {
    name: "Withdrawal Rejected",
    slug: "withdrawal-rejected",
    subject: "Withdrawal Request Update",
    description: "Sent when a user's withdrawal is rejected",
    variables: ["name", "amount", "reason"],
    htmlContent: generateEmailHtml(
      "withdrawal-rejected",
      "Withdrawal Request Update",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, unfortunately your withdrawal request could not be processed.</p>
      <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Amount:</strong> $\{{amount}}</p>
        <p style="margin: 0; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Reason:</strong> {{reason}}</p>
      </div>
      <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Please contact support if you have any questions.</p>`,
      "Contact Support"
    ),
  },
  {
    name: "KYC Approved",
    slug: "kyc-approved",
    subject: "KYC Verification Approved!",
    description: "Sent when a user's KYC is approved",
    variables: ["name"],
    htmlContent: generateEmailHtml(
      "kyc-approved",
      "KYC Verified! ✓",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, congratulations! Your identity verification has been approved.</p>
      <div style="background-color: #22c55e20; border: 1px solid #22c55e50; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; color: #22c55e; font-size: 18px; font-weight: bold;">✓ Verified Account</p>
      </div>
      <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">You now have full access to all trading features including deposits and withdrawals.</p>`,
      "Start Trading"
    ),
  },
  {
    name: "KYC Rejected",
    slug: "kyc-rejected",
    subject: "KYC Verification Update",
    description: "Sent when a user's KYC is rejected",
    variables: ["name", "reason"],
    htmlContent: generateEmailHtml(
      "kyc-rejected",
      "KYC Verification Update",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, your identity verification could not be completed.</p>
      <div style="background-color: #ef444420; border: 1px solid #ef444450; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px; color: #ef4444; font-size: 14px; font-weight: bold;">Reason:</p>
        <p style="margin: 0; color: #a0a0a0; font-size: 14px;">{{reason}}</p>
      </div>
      <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Please resubmit your documents with the required corrections.</p>`,
      "Resubmit Documents"
    ),
  },
  {
    name: "Password Reset",
    slug: "password-reset",
    subject: "Password Reset Request",
    description: "Sent when a user requests password reset",
    variables: ["name", "otp"],
    htmlContent: generateEmailHtml(
      "password-reset",
      "Reset Your Password",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, you have requested to reset your password. Use the OTP below:</p>
      <div style="background-color: #2a2a4a; border-radius: 12px; padding: 30px; margin-bottom: 20px; text-align: center;">
        <span style="font-size: 36px; font-weight: bold; color: #a855f7; letter-spacing: 8px;">{{otp}}</span>
      </div>
      <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;">This OTP will expire in <strong style="color: #ffffff;">10 minutes</strong>.</p>
      <p style="margin: 0; color: #a0a0a0; font-size: 14px;">If you didn't request this, please ignore this email.</p>`
    ),
  },
  {
    name: "Email Verification",
    slug: "email-verification",
    subject: "Verify Your Email",
    description: "Sent for email verification OTP",
    variables: ["name", "otp"],
    htmlContent: generateEmailHtml(
      "verification",
      "Verify Your Email",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, please use the following OTP to verify your email address:</p>
      <div style="background-color: #2a2a4a; border-radius: 12px; padding: 30px; margin-bottom: 20px; text-align: center;">
        <span style="font-size: 36px; font-weight: bold; color: #a855f7; letter-spacing: 8px;">{{otp}}</span>
      </div>
      <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;">This OTP will expire in <strong style="color: #ffffff;">10 minutes</strong>.</p>
      <p style="margin: 0; color: #a0a0a0; font-size: 14px;">If you didn't create an account, please ignore this email.</p>`
    ),
  },
  {
    name: "Trade Executed",
    slug: "trade-executed",
    subject: "Trade Executed: {{symbol}} {{type}}",
    description: "Sent when a trade is executed",
    variables: ["name", "symbol", "type", "volume", "price", "date"],
    htmlContent: generateEmailHtml(
      "trade",
      "Trade Executed",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, your trade has been executed successfully.</p>
      <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Symbol:</strong> {{symbol}}</p>
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Type:</strong> <span style="color: #a855f7;">{{type}}</span></p>
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Volume:</strong> {{volume}}</p>
        <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Price:</strong> {{price}}</p>
        <p style="margin: 0; color: #a0a0a0; font-size: 14px;"><strong style="color: #ffffff;">Date:</strong> {{date}}</p>
      </div>`,
      "View Trade"
    ),
  },
  {
    name: "Account Suspended",
    slug: "account-suspended",
    subject: "Account Suspended",
    description: "Sent when a user's account is suspended",
    variables: ["name", "reason"],
    htmlContent: generateEmailHtml(
      "suspended",
      "Account Suspended",
      `<p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Hi {{name}}, your account has been temporarily suspended.</p>
      <div style="background-color: #ef444420; border: 1px solid #ef444450; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px; color: #ef4444; font-size: 14px; font-weight: bold;">Reason:</p>
        <p style="margin: 0; color: #a0a0a0; font-size: 14px;">{{reason}}</p>
      </div>
      <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Please contact support for more information.</p>`,
      "Contact Support"
    ),
  },
];

const DEFAULT_TEMPLATES = TEMPLATE_PRESETS;

export default function EmailTemplatesPage() {
  const { confirm, Dialog: ConfirmDialog } = useConfirmationDialog();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    subject: "",
    htmlContent: "",
    description: "",
    variables: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/email-templates", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      } else {
        toast.error(data.message || "Failed to fetch templates");
      }
    } catch (error) {
      toast.error("Failed to fetch email templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug || !form.subject || !form.htmlContent) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const url = editingTemplate
        ? `/api/admin/email-templates/${editingTemplate._id}`
        : "/api/admin/email-templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          variables: form.variables.split(",").map((v) => v.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setDialogOpen(false);
        resetForm();
        fetchTemplates();
      } else {
        toast.error(data.message || "Failed to save template");
      }
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleDelete = (template: EmailTemplate) => {
    confirm(
      "Delete Template",
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/email-templates/${template._id}`, {
            method: "DELETE",
            credentials: "include",
          });

          const data = await res.json();
          if (data.success) {
            toast.success("Template deleted successfully");
            fetchTemplates();
          } else {
            toast.error(data.message || "Failed to delete template");
          }
        } catch (error) {
          toast.error("Failed to delete template");
        }
      },
      { confirmText: "Delete", variant: "destructive" }
    );
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const res = await fetch(`/api/admin/email-templates/${template._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !template.isActive }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Template ${!template.isActive ? "activated" : "deactivated"}`);
        fetchTemplates();
      } else {
        toast.error(data.message || "Failed to update template");
      }
    } catch (error) {
      toast.error("Failed to update template");
    }
  };

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      slug: template.slug,
      subject: template.subject,
      htmlContent: template.htmlContent,
      description: template.description || "",
      variables: template.variables.join(", "),
      isActive: template.isActive,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = (defaultTemplate?: typeof DEFAULT_TEMPLATES[0]) => {
    setEditingTemplate(null);
    if (defaultTemplate) {
      setForm({
        name: defaultTemplate.name,
        slug: defaultTemplate.slug,
        subject: defaultTemplate.subject,
        htmlContent: defaultTemplate.htmlContent,
        description: defaultTemplate.description || "",
        variables: defaultTemplate.variables.join(", "),
        isActive: true,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      subject: "",
      htmlContent: "",
      description: "",
      variables: "",
      isActive: true,
    });
    setEditingTemplate(null);
  };

  // Generate HTML from form fields
  const generateHtmlFromForm = () => {
    const { name, subject, description, variables } = form;
    
    // Parse variables to show in email
    const variablesList = variables.split(',').map(v => v.trim()).filter(Boolean);
    
    // Convert description text to HTML paragraphs
    const descriptionHtml = description
      .split('\n\n')
      .map(para => `<p style="margin: 0 0 16px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">${para.replace(/\n/g, '<br>')}</p>`)
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">${subject.replace(/\{\{.*?\}\}/g, match => `<span style="color: #a855f7;">${match}</span>`)}</h2>
              ${descriptionHtml}
              ${variablesList.length > 0 ? `
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin: 20px 0;">
                ${variablesList.map(v => `<p style="margin: 8px 0; color: #e0e0e0;"><strong style="color: #a855f7;">{{${v}}}</strong></p>`).join('')}
              </div>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;">Need help? Contact our support team</p>
              <p style="margin: 0; color: #606060; font-size: 12px;">© ${new Date().getFullYear()} NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    setForm({ ...form, htmlContent: html });
    toast.success('HTML content generated from form fields!');
  };

  const openPreview = (html: string) => {
    // If content doesn't look like HTML, wrap it in basic styling
    let previewContent = html;
    if (!html.trim().startsWith('<!DOCTYPE') && !html.trim().startsWith('<html') && !html.trim().startsWith('<body') && !html.includes('<table')) {
      previewContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              background-color: #1a1a2e; 
              color: #ffffff; 
              padding: 40px; 
              margin: 0;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #2a2a4a;
              padding: 30px;
              border-radius: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${html.replace(/\n/g, '<br>')}
          </div>
        </body>
        </html>
      `;
    }
    setPreviewHtml(previewContent);
    setPreviewOpen(true);
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check which default templates are missing
  const missingTemplates = DEFAULT_TEMPLATES.filter(
    (dt) => !templates.some((t) => t.slug === dt.slug)
  );

  return (
    <div className="p-6 space-y-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground">Manage email templates for user notifications</p>
        </div>
        <Button onClick={() => openCreateDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Missing Templates Alert */}
      {missingTemplates.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <p className="text-yellow-500 font-medium">Missing Default Templates</p>
                <p className="text-sm text-muted-foreground">
                  Create these templates to enable email notifications
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {missingTemplates.map((dt) => (
                  <Button
                    key={dt.slug}
                    size="sm"
                    variant="outline"
                    className="border-yellow-500/30 hover:bg-yellow-500/10"
                    onClick={() => openCreateDialog(dt)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {dt.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No email templates found</p>
            <Button onClick={() => openCreateDialog()} variant="outline" className="mt-4">
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template._id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">{template.slug}</CardDescription>
                  </div>
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Subject:</p>
                  <p className="text-sm font-medium truncate">{template.subject}</p>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openPreview(template.htmlContent)}>
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(template)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(template)}
                  >
                    {template.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Update the email template" : "Create a new email template"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Auto-generate from preset */}
            <div className="space-y-2 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4 text-purple-400" />
                <Label className="text-purple-400 font-medium">
                  {editingTemplate ? "Regenerate HTML from Preset" : "Auto-Generate Template"}
                </Label>
              </div>
              <Select
                onValueChange={(slug) => {
                  const preset = TEMPLATE_PRESETS.find((p) => p.slug === slug);
                  if (preset) {
                    if (editingTemplate) {
                      // For editing, only update HTML content
                      setForm({
                        ...form,
                        htmlContent: preset.htmlContent,
                      });
                      toast.success(`HTML content regenerated from "${preset.name}" preset`);
                    } else {
                      // For new template, fill all fields
                      setForm({
                        name: preset.name,
                        slug: preset.slug,
                        subject: preset.subject,
                        htmlContent: preset.htmlContent,
                        description: preset.description || "",
                        variables: preset.variables.join(", "),
                        isActive: true,
                      });
                      toast.success(`Loaded "${preset.name}" template`);
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={editingTemplate ? "Select a preset to regenerate HTML..." : "Select a preset template to auto-fill..."} />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.slug} value={preset.slug}>
                      <div className="flex flex-col">
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground">{preset.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editingTemplate 
                  ? "Select a preset to regenerate the HTML content. Other fields will remain unchanged."
                  : "Choose a preset to auto-generate HTML content, or create from scratch below."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (unique identifier) *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  placeholder="e.g., welcome"
                  disabled={!!editingTemplate}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g., Welcome to NalmiFX, {{name}}!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / Email Body Text</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Enter the email body text here. This will be used to generate the HTML content..."
                className="min-h-32 resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variables">Variables (comma-separated)</Label>
              <Input
                id="variables"
                value={form.variables}
                onChange={(e) => setForm({ ...form, variables: e.target.value })}
                placeholder="e.g., name, email, userId"
              />
              <p className="text-xs text-muted-foreground">
                Use these in your template as {"{{variableName}}"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="htmlContent">HTML Content *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={generateHtmlFromForm}
                    disabled={!form.subject || !form.description}
                  >
                    <Wand2 className="w-4 h-4 mr-1" />
                    Generate HTML from Form
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openPreview(form.htmlContent)}
                    disabled={!form.htmlContent}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Fill in Subject and Description above, then click "Generate HTML from Form" to auto-create styled HTML.
              </p>
              <Textarea
                id="htmlContent"
                value={form.htmlContent}
                onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                placeholder="Enter HTML email content or click 'Generate HTML from Form' button above..."
                className="min-h-75 font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[500px]"
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
