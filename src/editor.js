import {EditorState,Compartment,StateEffect,StateField,RangeSet} from '@codemirror/state';
import {EditorView,Decoration,GutterMarker,gutter,keymap,lineNumbers,highlightActiveLine,drawSelection,placeholder} from '@codemirror/view';
import {defaultKeymap,history,historyKeymap,indentWithTab} from '@codemirror/commands';
import {highlightAssembly} from './assembly.js';
import {cpp} from '@codemirror/lang-cpp';
import {syntaxHighlighting,defaultHighlightStyle,bracketMatching,indentOnInput} from '@codemirror/language';
const setDifferences=StateEffect.define();
const meaning={operands:'Yellow: same instruction, different operands or encoding.',different:'Red: a different instruction or an extra compiled instruction.',moved:'Blue: this instruction word appears at another position in the opposite side.'};
let tooltipId=0;
class DifferenceMarker extends GutterMarker {
 constructor(entry){super();this.entry=entry;}
 eq(other){return JSON.stringify(this.entry)===JSON.stringify(other.entry);}
 toDOM(){
  const button=document.createElement('button'),entry=this.entry;button.type='button';button.className=`source-diff-marker marker-${entry.kind}`;button.textContent=entry.kind==='operands'?'≠':entry.kind==='moved'?'↕':'!';button.setAttribute('aria-label',`Assembly differences for C line ${entry.line}`);
  let tooltip=null,timer;
  const onScroll=e=>{if(!tooltip?.contains(e.target))hide();};
  const hide=()=>{document.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',hide);clearTimeout(timer);tooltip?.remove();tooltip=null;button.removeAttribute('aria-describedby');};
  const show=()=>{clearTimeout(timer);if(tooltip)return;tooltip=document.createElement('div');tooltip.className='source-diff-tooltip';tooltip.id=`source-diff-tooltip-${++tooltipId}`;tooltip.setAttribute('role','tooltip');button.setAttribute('aria-describedby',tooltip.id);const heading=document.createElement('strong');heading.textContent=`C line ${entry.line} · ${entry.count} differing instruction${entry.count===1?'':'s'}`;const description=document.createElement('p');description.textContent=meaning[entry.kind];tooltip.append(heading,description);
   for(const instruction of entry.instructions){const row=document.createElement('div');row.className=`source-tooltip-row marker-${instruction.kind}`;const label=document.createElement('p');label.textContent=meaning[instruction.kind];row.append(label);for(const [name,insn] of [['Target',instruction.target],['Compiled',instruction.candidate]]){const caption=document.createElement('span');caption.className='source-tooltip-caption';caption.textContent=name;const code=document.createElement('pre');highlightAssembly(code,insn?`${insn.address.toString(16).toUpperCase()}  ${insn.word}  ${insn.text}`:'— no instruction —');row.append(caption,code);}tooltip.append(row);}
   tooltip.onmouseenter=()=>clearTimeout(timer);tooltip.onmouseleave=()=>{timer=setTimeout(hide,100);};document.body.append(tooltip);const rect=button.getBoundingClientRect(),line=button.parentElement.getBoundingClientRect(),gap=8;
   const below=Math.max(0,innerHeight-line.bottom-gap-8),above=Math.max(0,line.top-gap-8);
   const placeBelow=tooltip.offsetHeight<=below||below>=above;
   tooltip.style.maxHeight=`${Math.min(440,placeBelow?below:above)}px`;
   tooltip.style.left=`${Math.max(8,Math.min(rect.right+10,innerWidth-tooltip.offsetWidth-8))}px`;
   tooltip.style.top=`${placeBelow?line.bottom+gap:line.top-gap-tooltip.offsetHeight}px`;
   document.addEventListener('scroll',onScroll,true);window.addEventListener('resize',hide);
  };
  button.onmouseenter=show;button.onfocus=show;button.onmouseleave=()=>{timer=setTimeout(hide,100);};button.onblur=hide;button.onclick=show;button.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();hide();}};button.disposeTooltip=hide;return button;
 }
 destroy(dom){dom.disposeTooltip?.();}
}
const differenceMarkers=StateField.define({create:()=>RangeSet.empty,update(value,transaction){if(transaction.docChanged)return RangeSet.empty;for(const effect of transaction.effects)if(effect.is(setDifferences))return RangeSet.of(effect.value.filter(item=>item.line>0&&item.line<=transaction.state.doc.lines).sort((a,b)=>a.line-b.line).map(item=>new DifferenceMarker(item).range(transaction.state.doc.line(item.line).from)));return value;}});
const differenceGutter=gutter({class:'cm-difference-gutter',markers:view=>view.state.field(differenceMarkers),renderEmptyElements:true});
const differences=StateField.define({
 create:()=>Decoration.none,
 update(value,transaction){
  if(transaction.docChanged)return Decoration.none;
  for(const effect of transaction.effects)if(effect.is(setDifferences)){
   const ranges=effect.value.filter(item=>item.line>0&&item.line<=transaction.state.doc.lines).sort((a,b)=>a.line-b.line).map(item=>Decoration.line({attributes:{class:`cm-source-${item.kind}`,title:`${item.count} differing compiled instruction${item.count===1?'':'s'} mapped to C line ${item.line}`}}).range(transaction.state.doc.line(item.line).from));
   return Decoration.set(ranges);
  }
  return value;
 },provide:field=>EditorView.decorations.from(field)
});
export function createCEditor(parent,onChange=()=>{}){
 const editable=new Compartment();let disabled=false;
 const view=new EditorView({parent,state:EditorState.create({extensions:[differences,differenceMarkers,differenceGutter,EditorView.updateListener.of(update=>{if(update.docChanged)onChange();}),cpp(),lineNumbers(),history(),drawSelection(),highlightActiveLine(),bracketMatching(),indentOnInput(),syntaxHighlighting(defaultHighlightStyle),placeholder('Pair with the desktop app and select a function to load its C source.'),keymap.of([...defaultKeymap,...historyKeymap,indentWithTab]),EditorView.contentAttributes.of({'aria-label':'Candidate C source'}),editable.of([EditorState.readOnly.of(false),EditorView.editable.of(true)]),EditorView.theme({'&':{fontSize:'13px',backgroundColor:'#fffefa',border:'1px solid #d3cec1',borderRadius:'3px'},'.cm-content':{fontFamily:'ui-monospace, monospace',minHeight:'280px',padding:'14px 0'},'.cm-scroller':{overflow:'auto',maxHeight:'650px',lineHeight:'1.65'},'.cm-gutters':{backgroundColor:'#f3f1e9',color:'#938b7a',borderRight:'1px solid #e1ddd3'},'&.cm-focused':{outline:'2px solid #c5ac35',outlineOffset:'2px'},'.cm-activeLine':{backgroundColor:'#f8f5e9'}})]})});
 return {highlightDifferences(lines){view.dispatch({effects:setDifferences.of(lines)});},get value(){return view.state.doc.toString();},set value(text){view.dispatch({changes:{from:0,to:view.state.doc.length,insert:text}});},setDisabled(next){if(next===disabled)return;disabled=next;view.dispatch({effects:editable.reconfigure([EditorState.readOnly.of(next),EditorView.editable.of(!next)])});}};
}
