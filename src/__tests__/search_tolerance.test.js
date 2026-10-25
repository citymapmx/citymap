import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {fuzzyMatch} from '../lib/utils.js';
import {searchCandidatePattern} from '../lib/searchPattern.js';
import {searchCandidatePattern as nextPattern} from '../../web-next/src/lib/searchPattern.js';
import SearchSuggestions from '../components/home/SearchSuggestions.jsx';
import {useDataStore} from '../store/useDataStore.js';
import {sb} from '../lib/supabase.js';

describe('tolerant public business search',()=>{
  it.each([
    ['padl','Padel Life Tepic'],['padel','Club de Pádel Tepic'],['pdael','Padel Life Tepic'],
    ['cafe','Café del Centro'],['starbuks','Starbucks Manglar'],['piza','Pizza Micaela'],
  ])('matches %s to %s',(query,name)=>expect(fuzzyMatch(query,name)).toBe(true));
  it('does not turn unrelated names into results',()=>{
    expect(fuzzyMatch('padl','Hotel Las Palomas Tepic')).toBe(false);
    expect(fuzzyMatch('padl','Café del Centro')).toBe(false);
  });
  it('bounds generated patterns and treats user punctuation as data',()=>{
    for(const query of ['padl','café','starbucks','a'.repeat(2000),'.*()|[x]']) {
      const pattern=searchCandidatePattern(query);
      expect(pattern.length).toBeLessThan(1100);
      expect(pattern).toBe(nextPattern(query));
      expect(pattern).not.toContain('.*');
    }
    expect(searchCandidatePattern('.*()|[]')).toBe('');
  });
  it('requests fuzzy candidates without losing city, category, visibility or page filters',async()=>{
    useDataStore.setState({mapPinsCity:'tepic',mapPins:[]});
    const row={id:'padel',name:'Padel Life Tepic',photos:'[]',schedule:'{}',social_links:'{}'};
    const mock=vi.spyOn(sb,'get').mockResolvedValue([row]);
    try {
      const onBatch=vi.fn();
      expect(await useDataStore.getState().fetchMoreBiz({targetCity:'tepic',category:'fitness',query:'padl',offset:20,limit:20,onBatch})).toBe(1);
      const url=decodeURIComponent(mock.mock.calls[0][1]);
      expect(url).toContain('name.imatch.');
      expect(url).toContain('name.ilike.');
      expect(url).toContain('city_slug=eq.tepic');
      expect(url).toContain('status=eq.approved');
      expect(url).toContain('plan=neq.menu');
      expect(url).toContain('category=ilike.*fitness*');
      expect(url).toContain('offset=20');
      expect(url).toContain('limit=20');
      expect(onBatch).toHaveBeenCalledWith([expect.objectContaining({id:'padel'})]);
    } finally {mock.mockRestore();}
  });
});

describe('search thumbnails',()=>{
  it('shows photos and falls back to a logo or an initial without removing the name',()=>{
    const results=[{id:1,name:'Padel Life',photos:[{url:'https://example.com/padel.jpg'}]},{id:2,name:'Café',logo_url:'https://example.com/logo.png'},{id:3,name:'Tostadas'}];
    const html=renderToStaticMarkup(React.createElement(SearchSuggestions,{results,T:{border:'#ddd',card:'#fff',text:'#111',sub:'#555'},onSelect:()=>{},onViewAll:()=>{}}));
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html).toContain('padel.jpg');
    expect(html).toContain('logo.png');
    expect(html).toContain('Tostadas');
    expect(html).not.toContain('NaN');
    expect(html).toContain('Ver todos los resultados');
  });
});
