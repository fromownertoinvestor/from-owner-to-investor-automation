const Anthropic = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

const client = new Anthropic();

// Configuration
const CONFIG = {
  instagramToken: process.env.INSTAGRAM_TOKEN,
  facebookToken: process.env.FACEBOOK_TOKEN,
  youtubeToken: process.env.YOUTUBE_TOKEN,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  instagramPageId: process.env.INSTAGRAM_PAGE_ID,
  facebookPageId: process.env.FACEBOOK_PAGE_ID,
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID,
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  recipientEmail: "whaleskonzult@gmail.com",
};

// Get current time to determine post type
function getPostType() {
  const hour = new Date().getHours();
  
  if (hour === 7) {
    return "scaling"; // 7 AM EST - Scaling frameworks
  } else if (hour === 12) {
    return "ma"; // 12 PM EST - M&A/Acquisition strategies
  } else if (hour === 18) {
    return "exit"; // 6 PM EST - Exit planning
  }
  return "engagement"; // Fallback
}

// Generate content using Claude
async function generateContent(postType) {
  const prompts = {
    scaling: `Generate a professional, engaging post about SMB scaling frameworks. Include:
    - One actionable insight about growing a small business
    - A real example (generic, not a specific company)
    - Call-to-action at the end
    - 150-200 words
    Keep it professional, no emojis, institutional tone.`,
    
    ma: `Generate a professional post about M&A/acquisition strategies for SMB owners. Include:
    - One key framework about buying competitors or valuations
    - Real example (generic, not a specific company)
    - Due diligence insight
    - Call-to-action
    - 150-200 words
    Keep it professional, no emojis, institutional tone.`,
    
    exit: `Generate a professional post about exit planning and maximizing business value. Include:
    - One insight about selling a business
    - Real example (generic, not specific company)
    - Valuation consideration
    - Call-to-action
    - 150-200 words
    Keep it professional, no emojis, institutional tone.`,
    
    engagement: `Generate a professional engagement post asking followers about their business challenges. Include:
    - One question about scaling, M&A, or exits
    - Invitation to comment
    - 80-120 words
    Keep it professional, no emojis.`
  };

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompts[postType] || prompts.engagement
        }
      ]
    });

    return message.content[0].text;
  } catch (error) {
    console.error("Claude API error:", error);
    return getDefaultPost(postType);
  }
}

// Fallback posts if Claude fails
function getDefaultPost(postType) {
  const posts = {
    scaling: `How to Scale Your SMB from $500K to $2M Revenue

The difference between stalled and scaling businesses? Systems.

Most owners focus on sales. Institutional leaders focus on repeatable processes.

Here's what separates them:
1. Documented workflows (not in your head)
2. Delegable systems (not owner-dependent)
3. Measurable metrics (not guessing)

When you build this, your business becomes scalable.

What's holding your growth back right now?`,

    ma: `The 5-Point Framework Institutional Investors Use

When we evaluate acquisition targets, we don't just look at revenue.

We evaluate:
1. EBITDA multiple (can we buy at 3.5x and exit at 5x?)
2. Owner independence (does it need the founder?)
3. Scalability (can we grow it efficiently?)
4. Risk profile (what could go wrong?)
5. Real estate collateral (what backs our capital?)

Most deals fail because they miss #2, #3, or #4.

Which of these is strongest in your business?`,

    exit: `How to Sell Your Business for Maximum Value

Three factors determine your exit price:

1. EBITDA Multiples (2-6x depending on industry)
2. Growth trajectory (faster growth = higher multiple)
3. Owner independence (can it run without you?)

Most owners underestimate their business value.

Why? They think like owners, not investors.

If you're planning an exit in next 3-5 years, this changes everything.

What's your current EBITDA multiple?`,

    engagement: `What's the #1 challenge in growing your SMB right now?

Is it:
- Scaling without losing quality
- Finding and keeping good people
- Preparing to acquire competitors
- Planning your exit

Drop it in the comments. Let's solve it together.`
  };

  return posts[postType] || posts.engagement;
}

// Post to Instagram
async function postToInstagram(content) {
  try {
    const response = await fetch(
      `https://graph.instagram.com/v18.0/${CONFIG.instagramPageId}/caption_type`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          caption: content,
          access_token: CONFIG.instagramToken
        })
      }
    );

    console.log("Instagram post status:", response.status);
    return { platform: "Instagram", success: response.ok };
  } catch (error) {
    console.error("Instagram post error:", error);
    return { platform: "Instagram", success: false, error: error.message };
  }
}

// Post to Facebook
async function postToFacebook(content) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${CONFIG.facebookPageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          access_token: CONFIG.facebookToken
        })
      }
    );

    console.log("Facebook post status:", response.status);
    return { platform: "Facebook", success: response.ok };
  } catch (error) {
    console.error("Facebook post error:", error);
    return { platform: "Facebook", success: false, error: error.message };
  }
}

// Post to YouTube Community
async function postToYouTube(content) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/activities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CONFIG.youtubeToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          snippet: {
            type: "upload",
            description: content,
            channelId: CONFIG.youtubeChannelId
          }
        })
      }
    );

    console.log("YouTube post status:", response.status);
    return { platform: "YouTube", success: response.ok };
  } catch (error) {
    console.error("YouTube post error:", error);
    return { platform: "YouTube", success: false, error: error.message };
  }
}

// Send email digest
async function sendEmailDigest(results) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: CONFIG.emailUser,
        pass: CONFIG.emailPassword
      }
    });

    const postType = getPostType();
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    const mailOptions = {
      from: CONFIG.emailUser,
      to: CONFIG.recipientEmail,
      subject: `Daily Automation Report - ${timestamp}`,
      html: `
        <h2>From Owner to Investor - Daily Report</h2>
        <p><strong>Time:</strong> ${timestamp}</p>
        <p><strong>Post Type:</strong> ${postType}</p>
        
        <h3>Platform Status:</h3>
        <ul>
          ${results.map(r => `<li>${r.platform}: ${r.success ? "✅ Posted" : "❌ Failed"}</li>`).join("")}
        </ul>
        
        <p><strong>Next posts:</strong> 7 AM, 12 PM, 6 PM EST</p>
        <p>Your automation is running smoothly!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email error:", error);
  }
}

// Main automation function
async function runAutomation() {
  console.log("🚀 Starting automation...");
  
  const postType = getPostType();
  console.log(`📝 Generating ${postType} post...`);
  
  const content = await generateContent(postType);
  console.log(`✅ Content generated`);
  
  const results = [];
  
  // Post to all platforms
  console.log("📤 Posting to platforms...");
  results.push(await postToInstagram(content));
  results.push(await postToFacebook(content));
  results.push(await postToYouTube(content));
  
  // Send email digest
  await sendEmailDigest(results);
  
  console.log("✅ Automation complete");
}

// Run if called directly
if (require.main === module) {
  runAutomation().catch(console.error);
}

module.exports = { runAutomation, generateContent };
