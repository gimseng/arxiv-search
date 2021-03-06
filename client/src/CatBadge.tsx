import { cat_col, cat_desc } from "./categories";
import * as React from 'react';
export function CatBadge({onClick, cat}) {
    let {bg,dark} = cat_col(cat);
    return <a 
        className="link pv1 ph1 f7 tc b white bg-gray mt0 mb1 mh1 br2 dib" 
        style={{whiteSpace:"nowrap", backgroundColor:bg, color : dark ? "black" : "white"}} 
        onClick={onClick} 
        title={cat_desc(cat)}>{cat}</a>
}