import React from 'react';

export const Svg = (props: any) => React.createElement('svg', { ...props, xmlns: 'http://www.w3.org/2000/svg' });
export const Path = (props: any) => React.createElement('path', props);
export const Polyline = (props: any) => React.createElement('polyline', props);
export const Rect = (props: any) => React.createElement('rect', props);
export const Circle = (props: any) => React.createElement('circle', props);
export const Line = (props: any) => React.createElement('line', props);
export const G = (props: any) => React.createElement('g', props);
export const Defs = (props: any) => React.createElement('defs', props);
export const Stop = (props: any) => React.createElement('stop', props);
export const LinearGradient = (props: any) => React.createElement('linearGradient', props);
export { Svg as default };
