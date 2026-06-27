const Anthropic = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

// Initialize client - SIMPLE WAY
const client = new Anthropic();

// Get post type based on hour
function getPostType() {
  const hour = new Date().getHours();
  if (hour === 7) return "scaling";
  if (hour === 12) return "ma";
  if (hour === 18) return "exit";
  return "engagement";
}

// Generate content
async function generateContent(postType) {
  try {
    const prompts = {
      scaling: "Generate a 150-200 word Instagram post about scaling small businesses. Professional tone, no emojis.",
      ma: "Generate a 150-200 word Instagram post about M&A and acquisitions. Professional tone, no emojis.",
      exit: "Generate a 150-200 word Instagram post about exit planning. Professional tone, no emojis.",
      engagement: "Generate an 80-120 word Instagram post asking followers about their business challenges."
    };

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompts[postType] || prompts.engagement }]
    });

    return message.content[0].text;
  } catch (error) {
    console.error("Claude error:", error.message);
    return "What's your biggest business challenge right now? Drop it in the comments.";
  }
}

// Post to Instagram
async function postToInstagram(content) {
  try {
    const response = await fetch(
      `https://graph.instagram.com/v18.0/${process.env.INSTAGRAM_PAGE_ID}/caption_type`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          caption: content,
          access_token: process.env.INSTAGRAM_TOKEN
        })
      }
    );

    return { success: response.ok, status: response.status };
  } catch (error) {
    console.error("Instagram error:", error.message);
    return { success: false, status: 500 };
  }
}

// Send email
async function sendEmail(postType, content, result) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
    });

    const time = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "whaleskonzult@gmail.com",
      subject: `Instagram Post - ${postType} - ${time}`,
      html: `
        <h2>From Owner to Investor</h2>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Type:</strong> ${postType}</p>
        <h3>Content:</h3>
        <p>${content.replace(/\n/g, '<br>')}</p>
        <h3>Status:</h3>
        <p>${result.success ? "✅ Posted" : "❌ Failed (" + result.status + ")"}</p>
      `
    });

    console.log("Email sent");
  } catch (error) {
    console.error("Email error:", error.message);
  }
}

// Main function
async function main() {
  console.log("Starting automation...");
  const postType = getPostType();
  const content = await generateContent(postType);
  const result = await postToInstagram(content);
  await sendEmail(postType, content, result);
  console.log("Done");
}

main().catch(console.error);
