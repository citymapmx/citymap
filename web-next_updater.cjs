const fs = require('fs');

const path = '/Users/danielarana/Desktop/cityguide/web-next/src/app/[city]/[slug]/page.js';
let content = fs.readFileSync(path, 'utf8');

// 0. Import
if (!content.includes('import Image from')) {
    content = content.replace("import StarRow", "import Image from 'next/image';\nimport StarRow");
}

// 1. Banner
content = content.replace(
    /<img src=\{biz\.banner_url \|\| biz\.logo_url\} alt=\{biz\.name\} className="w-full h-full object-cover rounded-b-\[32px\]" \/>/,
    `{(biz.banner_url || biz.logo_url) && <Image src={biz.banner_url || biz.logo_url} alt={biz.name} fill className="object-cover rounded-b-[32px]" sizes="100vw" priority />}`
);

// 2. Gallery
content = content.replace(
    /<img src=\{photoUrl\} className="w-\[180px\] h-\[180px\] object-cover rounded-2xl border border-gray-200" alt=\{`Foto \$\{idx\+1\} de \$\{biz\.name\}`\} \/>/g,
    `<Image src={photoUrl} width={180} height={180} className="w-[180px] h-[180px] object-cover rounded-2xl border border-gray-200" alt={\`Foto \${idx+1} de \${biz.name}\`} unoptimized={photoUrl.includes('data:image')} />`
);

// 3. Events
content = content.replace(
    /<img src=\{ev\.img_url \|\| ev\.img\} className="w-\[60px\] h-\[60px\] rounded-\[10px\] object-cover bg-gray-100" alt=\{ev\.title\} \/>/g,
    `{(ev.img_url || ev.img) ? <Image src={ev.img_url || ev.img} width={60} height={60} className="w-[60px] h-[60px] rounded-[10px] object-cover bg-gray-100" alt={ev.title} unoptimized={(ev.img_url || ev.img).includes('data:image')} /> : <div className="w-[60px] h-[60px] rounded-[10px] bg-gray-100" />}`
);

// 4. Avatar
content = content.replace(
    /<img src=\{rev\.user_avatar\} alt=\{rev\.user_name\} className="w-full h-full object-cover"\/>/g,
    `<Image src={rev.user_avatar} alt={rev.user_name || 'User'} width={32} height={32} className="w-full h-full object-cover" unoptimized={rev.user_avatar.includes('data:image')}/>`
);

// 5. Review Photo
content = content.replace(
    /<img src=\{rev\.photo_url\} alt="Foto de reseña" className="w-\[120px\] h-\[120px\] object-cover rounded-xl border border-gray-100" \/>/g,
    `<Image src={rev.photo_url} alt="Foto de reseña" width={120} height={120} className="w-[120px] h-[120px] object-cover rounded-xl border border-gray-100" unoptimized={rev.photo_url.includes('data:image')} />`
);

fs.writeFileSync(path, content);
console.log('Update done');
