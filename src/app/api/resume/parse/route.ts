import { NextRequest, NextResponse } from "next/server";
import { parsePdfResume } from "@/server/resume/parser";
import { extractSkillsFromResume } from "@/server/resume/skills";

// Enforce max upload limit of 5 MB
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No PDF file provided. Please attach a valid PDF document." },
        { status: 400 }
      );
    }

    // 1. File size check
    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty. Please upload a valid resume." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please upload a smaller resume.`,
        },
        { status: 400 }
      );
    }

    // 2. MIME type validation
    const mimeType = file.type;
    const fileName = file.name || "resume.pdf";

    if (
      mimeType &&
      mimeType !== "application/pdf" &&
      mimeType !== "application/x-pdf" &&
      !fileName.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Invalid document type. Only PDF resumes are supported." },
        { status: 400 }
      );
    }

    // 3. Read buffer into memory transiently
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 4. Parse text using our secure in-memory parser
    const parseResult = await parsePdfResume(uint8Array);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error || "Failed to extract text from the PDF document.",
          warnings: parseResult.warnings,
        },
        { status: 422 }
      );
    }

    // 5. Deterministic skill and experience extraction
    const skillResult = extractSkillsFromResume(parseResult.text);

    // Combine warnings
    const combinedWarnings = [...parseResult.warnings, ...skillResult.warnings];

    // Return structured candidate profile (WITHOUT returning raw resume text or personal details)
    return NextResponse.json({
      success: true,
      profile: {
        id: `profile-${Date.now()}`,
        extractedSkills: skillResult.detectedSkills,
        userSkills: skillResult.detectedSkills, // Defaults to extracted skills
        experienceYears: skillResult.experienceYears,
        experienceLevelHint: skillResult.experienceLevelHint,
        preferredArrangements: ["remote", "hybrid"], // Default sensible preference
        parsedAt: new Date().toISOString(),
        parsingWarnings: combinedWarnings,
        fileName: fileName.replace(/[^\w.-]/g, "_"), // Sanitize file name
        fileSizeBytes: file.size,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing the resume. Please check the document format.",
      },
      { status: 500 }
    );
  }
}
