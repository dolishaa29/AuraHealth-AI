function clean(text)
{
    return String(text==null ? "" : text)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");
}



function emailTemplate(options)
{
    let title=clean(options.title);
    let greeting=options.name ? "Hi "+clean(options.name)+"," : "Hi there,";
    let message=clean(options.message);

    let codeBox="";
    if(options.code)
    {
        codeBox=`
        <tr><td style="padding:8px 40px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="background:#EEEDFF;border:1px dashed #C9C8E0;border-radius:16px;padding:22px 16px;">
                    <div style="font-size:12px;font-weight:600;color:#6B6A8A;text-transform:uppercase;letter-spacing:1.5px;">${clean(options.codeLabel || "Your code")}</div>
                    <div style="font-size:34px;font-weight:800;color:#312E81;letter-spacing:8px;margin-top:8px;font-family:'Courier New',monospace;">${clean(options.code)}</div>
                </td></tr>
            </table>
        </td></tr>`;
    }

    let detailsBox="";
    if(options.details && options.details.length>0)
    {
        let rows="";
        for(let item of options.details)
        {
            rows=rows+`
                <tr>
                    <td style="padding:10px 18px;font-size:14px;color:#6B6A8A;border-bottom:1px solid #E4E3F5;">${clean(item.label)}</td>
                    <td align="right" style="padding:10px 18px;font-size:14px;font-weight:700;color:#1E1B4B;border-bottom:1px solid #E4E3F5;">${clean(item.value)}</td>
                </tr>`;
        }
        detailsBox=`
        <tr><td style="padding:8px 40px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6FD;border:1px solid #E4E3F5;border-radius:16px;border-collapse:separate;overflow:hidden;">
                ${rows}
            </table>
        </td></tr>`;
    }

    let button="";
    if(options.buttonText && options.buttonLink)
    {
        button=`
        <tr><td align="center" style="padding:24px 40px 4px;">
            <a href="${clean(options.buttonLink)}" style="display:inline-block;background:#4F46E5;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;">${clean(options.buttonText)} &rarr;</a>
        </td></tr>`;
    }

    let note="";
    if(options.note)
    {
        note=`
        <tr><td style="padding:20px 40px 0;font-size:13px;line-height:20px;color:#8F8EAB;">${clean(options.note)}</td></tr>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F6F6FD;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6FD;">
<tr><td align="center" style="padding:32px 16px;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 8px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="width:36px;height:36px;background:#4F46E5;border-radius:11px;text-align:center;vertical-align:middle;color:#ffffff;font-size:18px;line-height:36px;">&#9829;</td>
                    <td style="padding-left:10px;font-size:20px;font-weight:800;color:#1E1B4B;">AuraHealth</td>
                </tr>
            </table>
        </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E4E3F5;border-radius:24px;border-collapse:separate;overflow:hidden;">
        <tr><td style="height:6px;background:#4F46E5;background-image:linear-gradient(90deg,#4F46E5,#7C3AED);font-size:0;line-height:0;">&nbsp;</td></tr>

        <tr><td style="padding:36px 40px 8px;">
            <h1 style="margin:0;font-size:24px;line-height:32px;font-weight:800;color:#1E1B4B;">${title}</h1>
        </td></tr>

        <tr><td style="padding:12px 40px 8px;font-size:15px;line-height:24px;color:#4B4A6B;">
            <p style="margin:0 0 10px;">${greeting}</p>
            <p style="margin:0;">${message}</p>
        </td></tr>

        ${codeBox}
        ${detailsBox}
        ${button}
        ${note}

        <tr><td style="padding:32px 40px 0;">
            <div style="border-top:1px solid #E4E3F5;"></div>
        </td></tr>
        <tr><td style="padding:20px 40px 32px;font-size:14px;line-height:22px;color:#4B4A6B;">
            Stay healthy,<br><strong style="color:#1E1B4B;">Team AuraHealth</strong>
        </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td align="center" style="padding:24px 16px 0;font-size:12px;line-height:18px;color:#8F8EAB;">
            Care that comes to you &middot; Doctors, AI health tools and reminders in one place<br>
            This is an automated email, please don't reply to it.<br>
            &copy; ${new Date().getFullYear()} AuraHealth
        </td></tr>
    </table>

</td></tr>
</table>
</body>
</html>`;
}



module.exports={emailTemplate};
