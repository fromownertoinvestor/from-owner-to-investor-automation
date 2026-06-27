const Anthropic = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

// Properly initialize Anthropic client
const client = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Configuration
const CONFIG = {
  instagramToken: process.env.INSTAGRAM_TOKEN,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  instagramPageId: process.env.INSTAGRAM_PAGE_ID,
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  recipientEmail: "whaleskonzult@gmail.com",
};

// Get current time to determine post type
function getPostType() {
  const hour = new Date().getHours();
  
  if (hour === 7) {
    return "scaling"; // 7 AM EST
  } else if (hour === 12) {
    return "ma"; // 12 PM EST
  } else if (hour === 18) {
    return "exit"; // 6 PM EST
  }
  return "engagement";
}

// Generate content using Claude
async function generateContent(postType) {
  const prompts = {
    scaling: `Generate a professional Instagram post about scaling a small business. Include:
    - One actionable insight
    - Real example (generic, not specific company)
    - Call-to-action
    - 150-200 words
    - Professional tone, no emojis`,
    
    ma: `Generate a professional Instagram post about M&A and acquiring competitors. Include:
    - One key framework
    - Real example (generic)
    - Due diligence insight
    - Call-to-action
    - 150-200 words
    - Professional tone, no emojis`,
    
    exit: `Generate a professional Instagram post about exit planning and selling your business. Include:
    - One insight about maximizing value
    - Real example (generic)
    - Valuation tip
    - Call-to-action
    - 150-200 words
    - Professional tone, no emojis`,
    
    engagement: `Generate a professional Instagram engagement post asking followers about their business challenges. Include:
    - One question about scaling, M&A, or exits
    - Invitation to comment
    - 80-120 words
    - Professional tone`
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

// Fallback posts
function getDefaultPost(postType) {
  const posts = {
    scaling: `How to Scale Your SMB from $500K to $2M

The difference between stalled and scaling businesses? Systems.

Most owners focus on sales. Institutional leaders focus on repeatable processes.

Here's what separates them:
1. Documented workflows (not in your head)
2. Delegable systems (not owner-dependent)
3. Measurable metrics (not guessing)

When you build this, your business becomes scalable.

What's holding your growth back right now?`,

    ma: `The 5-Point Framework Institutional Investors Use

When we evaluate acquisition targets:

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

If you're planning an exit in the next 3-5 years, this changes everything.

What's your current EBITDA multiple?`,

    engagement: `What's the #1 challenge in growing your SMB right now?

Is it:
- Scaling without losing quality
- Finding and keeping good people
- Preparing to acquire competitors
- Planning your exit

Drop it in the comments.`
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

    const responseData = await response.json();
    console.log("Instagram response:", responseData);

    return { 
      platform: "Instagram", 
      success: response.ok, 
      status: response.status,
      response: responseData
    };
  } catch (error) {
    console.error("Instagram post error:", error);
    return { platform: "Instagram", success: false, error: error.message };
  }
}

// Send email digest
async function sendEmailDigest(result, postType, content) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: CONFIG.emailUser,
        pass: CONFIG.emailPassword
      }
    });

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    const mailOptions = {
      from: CONFIG.emailUser,
      to: CONFIG.recipientEmail,
      subject: `Instagram Post - ${postType.toUpperCase()} - ${timestamp}`,
      html: `
        <h2>From Owner to Investor - Instagram Post</h2>
        <p><strong>Time:</strong> ${timestamp}</p>
        <p><strong>Post Type:</strong> ${postType}</p>
        
        <h3>Post Content:</h3>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: Arial;">
          ${content.replace(/\n/g, '<br>')}
        </p>
        
        <h3>Status:</h3>
        <p><strong>Instagram:</strong> ${result.success ? "✅ Posted successfully" : "❌ Failed - " + (result.status || result.error)}</p>
        
        ${result.response ? `<p style="font-size: 12px; color: #666;"><strong>Response:</strong> ${JSON.stringify(result.response)}</p>` : ''}
        
        <p><strong>Next posts:</strong> 7 AM, 12 PM, 6 PM EST</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Your Instagram automation is running.
        </p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email error:", error);
  }
}

// Main automation
async function runAutomation() {
  console.log("🚀 Starting Instagram automation...");
  
  const postType = getPostType();
  console.log(`📝 Generating ${postType} post...`);
  
  const content = await generateContent(postType);
  console.log(`✅ Content generated`);
  
  console.log("📤 Posting to Instagram...");
  const result = await postToInstagram(content);
  
  console.log(`Result:`, result);
  
  await sendEmailDigest(result, postType, content);
  
  console.log("✅ Automation complete");
}

if (require.main === module) {
  runAutomation().catch(console.error);
}

module.exports = { runAutomation, generateContent };
