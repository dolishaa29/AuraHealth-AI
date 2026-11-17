let colors={
    indigo:"#4F46E5",
    navy:"#1E1B4B",
    deep:"#312E81",
    text:"#4B4A6B",
    muted:"#6B6A8A",
    light:"#8F8EAB",
    border:"#E4E3F5",
    page:"#F6F6FD",
    hero:"#E9E8FF",
    soft:"#EEEDFF"
};

let tileColors={
    indigo:{bg:"#EEEDFF",text:"#3730A3"},
    green:{bg:"#E7F7EF",text:"#05603A"},
    orange:{bg:"#FFF0E6",text:"#9A3412"},
    blue:{bg:"#E6F1FF",text:"#1E40AF"},
    red:{bg:"#FFECEB",text:"#B42318"}
};

let alertColors={
    info:{bg:"#EEEDFF",border:"#DAD8FF",text:"#3730A3",icon:"&#8505;"},
    success:{bg:"#E7F7EF",border:"#C6EBD8",text:"#05603A",icon:"&#10003;"},
    warning:{bg:"#FFF0E6",border:"#FFD9BF",text:"#9A3412",icon:"!"},
    danger:{bg:"#FFECEB",border:"#FFCFCB",text:"#B42318",icon:"!"}
};



function clean(text)
{
    return String(text==null ? "" : text)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");
}



function heroSection(options)
{
    let badge="";
    if(options.badge)
    {
        badge=`<span style="display:inline-block;background:#ffffff;color:${colors.indigo};font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;">${clean(options.badge)}</span>`;
    }

    let subtitle="";
    if(options.subtitle)
    {
        subtitle=`<p style="margin:8px 0 0;font-size:15px;line-height:22px;color:${colors.text};">${clean(options.subtitle)}</p>`;
    }

    let icon="";
    if(options.icon)
    {
        icon=`
            <td class="hide-mobile" width="96" align="right" valign="middle">
                <div style="width:84px;height:84px;border-radius:999px;background:#ffffff;text-align:center;line-height:84px;font-size:38px;box-shadow:0 12px 30px rgba(79,70,229,0.18);">${options.icon}</div>
            </td>`;
    }

    return `
    <tr><td style="padding:24px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.hero};border-radius:24px;">
            <tr>
                <td style="padding:28px 28px;" valign="middle">
                    ${badge}
                    <h1 style="margin:14px 0 0;font-size:26px;line-height:32px;font-weight:800;color:${colors.navy};letter-spacing:-0.5px;">${clean(options.title)}</h1>
                    ${subtitle}
                </td>
                ${icon}
                ${options.icon ? '<td width="24"></td>' : ""}
            </tr>
        </table>
    </td></tr>`;
}



function codeSection(options)
{
    if(!options.code)
    {
        return "";
    }
    let code=String(options.code);
    let size=code.length>8 ? "22px" : "36px";
    let spacing=code.length>8 ? "2px" : "10px";

    let expiry="";
    if(options.codeExpiry)
    {
        expiry=`<div style="margin-top:10px;font-size:13px;color:${colors.muted};">&#9201; ${clean(options.codeExpiry)}</div>`;
    }

    return `
    <tr><td style="padding:20px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.page};border:1px solid ${colors.border};border-radius:20px;">
            <tr><td align="center" style="padding:24px 16px;">
                <div style="font-size:12px;font-weight:700;color:${colors.muted};text-transform:uppercase;letter-spacing:1.5px;">${clean(options.codeLabel || "Your code")}</div>
                <div style="display:inline-block;margin-top:12px;background:#ffffff;border:1px dashed #C9C8E0;border-radius:14px;padding:12px 22px;font-family:'Courier New',monospace;font-size:${size};font-weight:800;letter-spacing:${spacing};color:${colors.deep};">${clean(code)}</div>
                ${expiry}
            </td></tr>
        </table>
    </td></tr>`;
}



function tilesSection(tiles)
{
    if(!tiles || tiles.length===0)
    {
        return "";
    }

    let cells="";
    let width=Math.floor(100/tiles.length);
    for(let i=0;i<tiles.length;i++)
    {
        let tile=tiles[i];
        let c=tileColors[tile.color] || tileColors.indigo;
        let gap=i<tiles.length-1 ? "padding-right:10px;" : "";
        cells=cells+`
            <td class="stack" width="${width}%" valign="top" style="${gap}">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};border-radius:18px;">
                    <tr><td style="padding:16px 16px;">
                        <div style="font-size:20px;line-height:24px;">${tile.icon || ""}</div>
                        <div style="margin-top:8px;font-size:12px;font-weight:600;color:${c.text};opacity:0.85;">${clean(tile.label)}</div>
                        <div style="margin-top:2px;font-size:17px;font-weight:800;color:${colors.navy};">${clean(tile.value)}</div>
                    </td></tr>
                </table>
            </td>`;
    }

    return `
    <tr><td style="padding:20px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>${cells}</tr>
        </table>
    </td></tr>`;
}



function detailsSection(title,details)
{
    if(!details || details.length===0)
    {
        return "";
    }

    let rows="";
    for(let i=0;i<details.length;i++)
    {
        let item=details[i];
        let line=i<details.length-1 ? `border-bottom:1px solid ${colors.border};` : "";
        rows=rows+`
            <tr>
                <td style="padding:13px 20px;font-size:14px;color:${colors.muted};${line}">${clean(item.label)}</td>
                <td align="right" style="padding:13px 20px;font-size:14px;font-weight:700;color:${colors.navy};${line}">${clean(item.value)}</td>
            </tr>`;
    }

    let heading="";
    if(title)
    {
        heading=`<div style="margin-bottom:10px;font-size:15px;font-weight:800;color:${colors.navy};">${clean(title)}</div>`;
    }

    return `
    <tr><td style="padding:24px 32px 0;">
        ${heading}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${colors.border};border-radius:18px;border-collapse:separate;">
            ${rows}
        </table>
    </td></tr>`;
}



function stepsSection(title,steps)
{
    if(!steps || steps.length===0)
    {
        return "";
    }

    let rows="";
    for(let i=0;i<steps.length;i++)
    {
        rows=rows+`
            <tr>
                <td width="40" valign="top" style="padding:8px 0;">
                    <div style="width:28px;height:28px;border-radius:999px;background:${colors.indigo};color:#ffffff;font-size:13px;font-weight:800;text-align:center;line-height:28px;">${i+1}</div>
                </td>
                <td valign="top" style="padding:8px 0;">
                    <div style="font-size:14px;font-weight:700;color:${colors.navy};line-height:20px;">${clean(steps[i].title)}</div>
                    <div style="font-size:13px;color:${colors.muted};line-height:19px;">${clean(steps[i].text)}</div>
                </td>
            </tr>`;
    }

    return `
    <tr><td style="padding:24px 32px 0;">
        <div style="margin-bottom:6px;font-size:15px;font-weight:800;color:${colors.navy};">${clean(title || "Next steps")}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>`;
}



function buttonSection(options)
{
    if(!options.buttonText || !options.buttonLink)
    {
        return "";
    }
    return `
    <tr><td align="center" style="padding:28px 32px 0;">
        <a href="${clean(options.buttonLink)}" style="display:inline-block;background:${colors.indigo};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 34px;border-radius:999px;box-shadow:0 10px 20px -6px rgba(79,70,229,0.5);">${clean(options.buttonText)} &nbsp;&rarr;</a>
    </td></tr>`;
}



function alertSection(alert)
{
    if(!alert || !alert.text)
    {
        return "";
    }
    let c=alertColors[alert.type] || alertColors.info;
    return `
    <tr><td style="padding:24px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};border:1px solid ${c.border};border-radius:16px;">
            <tr>
                <td width="44" valign="top" style="padding:16px 0 16px 16px;">
                    <div style="width:24px;height:24px;border-radius:999px;background:${c.text};color:#ffffff;font-size:13px;font-weight:800;text-align:center;line-height:24px;">${c.icon}</div>
                </td>
                <td style="padding:16px 18px 16px 4px;font-size:13px;line-height:20px;color:${c.text};">
                    ${alert.title ? `<strong style="display:block;font-size:14px;margin-bottom:2px;">${clean(alert.title)}</strong>` : ""}
                    ${clean(alert.text)}
                </td>
            </tr>
        </table>
    </td></tr>`;
}



function emailTemplate(options)
{
    let greeting=options.name ? "Hi "+clean(options.name)+"," : "Hi there,";
    let site=process.env.FRONTEND_URL;

    let footerLinks="";
    if(site)
    {
        let link=`color:${colors.indigo};text-decoration:none;font-weight:600;`;
        footerLinks=`
            <a href="${clean(site)}" style="${link}">Website</a> &nbsp;&middot;&nbsp;
            <a href="${clean(site)}/login" style="${link}">Log in</a> &nbsp;&middot;&nbsp;
            <a href="${clean(site)}/#faq" style="${link}">Help</a><br><br>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${clean(options.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
    @media only screen and (max-width:600px){
        .stack{display:block!important;width:100%!important;padding:0 0 10px 0!important;}
        .hide-mobile{display:none!important;}
        .card-pad{padding-left:0!important;padding-right:0!important;}
    }
</style>
</head>
<body style="margin:0;padding:0;background:${colors.page};font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${clean(options.preview || options.subtitle || options.title)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.page};">
<tr><td align="center" class="card-pad" style="padding:32px 12px;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr>
            <td style="padding:0 12px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="width:38px;height:38px;background:${colors.indigo};border-radius:12px;text-align:center;vertical-align:middle;color:#ffffff;font-size:18px;line-height:38px;">&#9829;</td>
                        <td style="padding-left:10px;font-size:20px;font-weight:800;color:${colors.navy};letter-spacing:-0.3px;">AuraHealth</td>
                    </tr>
                </table>
            </td>
            <td align="right" style="padding:0 12px 20px;font-size:12px;font-weight:600;color:${colors.light};">${clean(options.label || "")}</td>
        </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:28px;box-shadow:0 8px 30px rgba(79,70,229,0.08);">

        ${heroSection(options)}

        <tr><td style="padding:28px 32px 0;font-size:15px;line-height:24px;color:${colors.text};">
            <p style="margin:0 0 10px;font-weight:700;color:${colors.navy};">${greeting}</p>
            <p style="margin:0;">${clean(options.message)}</p>
        </td></tr>

        ${codeSection(options)}
        ${tilesSection(options.tiles)}
        ${detailsSection(options.detailsTitle,options.details)}
        ${stepsSection(options.stepsTitle,options.steps)}
        ${buttonSection(options)}
        ${alertSection(options.alert)}

        <tr><td style="padding:32px 32px 0;">
            <div style="border-top:1px solid ${colors.border};font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>
        <tr><td style="padding:20px 32px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="width:40px;height:40px;border-radius:999px;background:${colors.soft};text-align:center;line-height:40px;color:${colors.indigo};font-size:16px;">&#9829;</td>
                    <td style="padding-left:12px;font-size:14px;line-height:20px;color:${colors.text};">
                        Stay healthy,<br><strong style="color:${colors.navy};">Team AuraHealth</strong>
                    </td>
                </tr>
            </table>
        </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td align="center" style="padding:28px 16px 0;font-size:12px;line-height:19px;color:${colors.light};">
            ${footerLinks}
            Doctors, AI health tools and reminders &mdash; all in one place.<br>
            This is an automated email, please don't reply to it.<br>
            &copy; ${new Date().getFullYear()} AuraHealth. All rights reserved.
        </td></tr>
    </table>

</td></tr>
</table>
</body>
</html>`;
}



function indiaTime()
{
    return new Date().toLocaleString("en-IN",{
        timeZone:"Asia/Kolkata",
        day:"numeric",
        month:"short",
        year:"numeric",
        hour:"numeric",
        minute:"2-digit"
    });
}



module.exports={emailTemplate,indiaTime};
