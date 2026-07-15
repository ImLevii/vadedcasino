let i=[];function b(u,s){u.emit(`${s}:subscribe`),i.push(s)}function e(u){i.forEach(s=>u.emit(`${s}:unsubscribe`)),i=[]}export{b as s,e as u};
