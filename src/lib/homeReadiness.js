// Wait for the current city's rendered first screen, rather than a loading timer.
export function getHomeVisualState(doc,citySlug,viewport={width:0,height:0}) {
  const home=Array.from(doc.querySelectorAll('[data-city-home]')).find(el=>el.getAttribute('data-city-home')===citySlug);
  if(!home)return 'loading';
  if(doc.fonts&&(!doc.fonts.check('500 16px Geist')))return 'loading';
  const images=Array.from(home.querySelectorAll('img')).filter(img=>{
    if(img.closest?.('[aria-hidden="true"]'))return false;
    const box=img.getBoundingClientRect();
    return box.width>0&&box.height>0&&box.bottom>0&&box.right>0&&box.top<viewport.height&&box.left<viewport.width;
  });
  const logo=doc.querySelector('.city-arrival-logo');
  if(logo)images.push(logo);
  if(images.some(img=>!img.complete))return 'loading';
  if(images.some(img=>img.naturalWidth===0))return 'error';
  return 'ready';
}
