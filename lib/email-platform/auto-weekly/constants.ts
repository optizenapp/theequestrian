/**
 * Default structured prompt for the auto weekly intro (Yorkshire-style).
 * Placeholders: {{productContext}}, {{sendDate}}
 */
export const DEFAULT_INTRO_PROMPT = `Context: You are writing the opening paragraph for The Equestrian's weekly email. The email features 3 products for the equestrian community. Your intro should feel warm and personal and drive interest in the products below.

User Prompt: Write the email intro for this week's send.

Product context (featured in this email):
{{productContext}}

Send date: {{sendDate}}

Requirements:
- The intro MUST start with "Hey there," (you can start with the next phrase after that; "Hey there," may be added automatically).
- Reference all 3 products by name.
- Where a product has a sale price or save percentage, mention the discount or value (e.g. "X% off", "now $Y").
- If product details suggest colours or sizing, reference them where relevant.
- Keep a seasonal or timely tone where appropriate (e.g. autumn riding, summer care).
- Warm, community-focused tone suitable for equestrian customers.
- 2–4 sentences total; concise but engaging.
- Do NOT include URLs or hashtags.

Return ONLY the intro paragraph text, nothing else.`;

/**
 * Default structured prompt for the auto weekly subject line (Yorkshire-style).
 * Placeholders: {{productContext}}, {{sendDate}}
 */
export const DEFAULT_SUBJECT_PROMPT = `Context: You are writing the subject line for The Equestrian's weekly email. The email features 3 products for the equestrian community. The subject should be engaging and encourage opens without being spammy.

User Prompt: Create an engaging email subject line for this week's send.

Product context (featured in this email):
{{productContext}}

Send date: {{sendDate}}

Requirements:
- Maximum 60 characters so it displays well in inboxes.
- Warm, community-focused tone appropriate for equestrian customers.
- You may reference one product name, a sale/offer, or a seasonal hook—do not try to list all three.
- No all caps, excessive punctuation, or spammy language.
- Do NOT include URLs or hashtags.

Return ONLY the subject line text, nothing else.`;

/**
 * Default prompt for the auto weekly email heading (optional LLM Heading block).
 * Placeholders: {{productContext}}, {{sendDate}}
 */
export const DEFAULT_HEADING_PROMPT = `Context: You are writing a short email heading for The Equestrian's weekly product email. The email features 3 products below.

User Prompt: Write one short headline (e.g. product name, or "This week's picks") for the email.

Product context:
{{productContext}}

Send date: {{sendDate}}

Requirements:
- One short phrase only (under 10 words). No full sentences.
- Can be a product name, "This week's picks", or similar. Warm tone.
- Return ONLY the heading text, nothing else.`;

/**
 * Default guidance for the LLM that picks 3 products for the auto weekly email (Curated Products block).
 * Optional; when the block has no prompt, this is used. Short instructions the model uses when choosing
 * from the candidate list (best sellers, on-sale, branded).
 */
export const DEFAULT_CURATED_PRODUCTS_PROMPT = `Prefer a mix: at least one best_seller, one on_sale, and one branded when possible. Favour products that suit the equestrian community (riding wear, horse care, grooming, rugs, gear).`;
