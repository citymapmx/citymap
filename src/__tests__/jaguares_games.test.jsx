import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import JaguaresGames from '../components/detail/JaguaresGames.jsx';
import NextGames from '../../web-next/src/components/detail/JaguaresGames.jsx';
const T={text:'#111',sub:'#666'};
describe.each([['Vite',JaguaresGames],['Next',NextGames]])('%s Jaguares calendar module',(_name,Games)=>{
  it('shows the official calendar only on the Jaguares profile',()=>{
    const html=renderToStaticMarkup(<Games business={{slug:'tepic-jaguares-de-nayarit',name:'Jaguares de Nayarit'}} T={T}/>);
    expect(html).toContain('Juegos de Jaguares');
    expect(html).toContain('href="https://jaguaresdenayarit.com/rol-de-juego/"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('En vivo');
    expect(html).not.toContain('Último resultado');
  });
  it('does not add the module to unrelated businesses',()=>{
    expect(renderToStaticMarkup(<Games business={{slug:'kava',name:'KAVA'}} T={T}/>)).toBe('');
  });
  it('supports the profile before its slug has loaded',()=>{
    expect(renderToStaticMarkup(<Games business={{name:'Jaguares de Nayarit'}} T={T}/>)).toContain('Ver calendario');
  });
});
