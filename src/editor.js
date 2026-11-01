import {EditorState,Compartment,StateEffect,StateField} from '@codemirror/state';
import {EditorView,Decoration,keymap,lineNumbers,highlightActiveLine,drawSelection,placeholder} from '@codemirror/view';
import {defaultKeymap,history,historyKeymap,indentWithTab} from '@codemirror/commands';
import {cpp} from '@codemirror/lang-cpp';
import {syntaxHighlighting,defaultHighlightStyle,bracketMatching,indentOnInput} from '@codemirror/language';
const setDifferences=StateEffect.define();
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
 const view=new EditorView({parent,state:EditorState.create({extensions:[differences,EditorView.updateListener.of(update=>{if(update.docChanged)onChange();}),cpp(),lineNumbers(),history(),drawSelection(),highlightActiveLine(),bracketMatching(),indentOnInput(),syntaxHighlighting(defaultHighlightStyle),placeholder('Pair with the desktop app and select a function to load its C source.'),keymap.of([...defaultKeymap,...historyKeymap,indentWithTab]),EditorView.contentAttributes.of({'aria-label':'Candidate C source'}),editable.of([EditorState.readOnly.of(false),EditorView.editable.of(true)]),EditorView.theme({'&':{fontSize:'13px',backgroundColor:'#fffefa',border:'1px solid #d3cec1',borderRadius:'3px'},'.cm-content':{fontFamily:'ui-monospace, monospace',minHeight:'280px',padding:'14px 0'},'.cm-scroller':{overflow:'auto',maxHeight:'650px',lineHeight:'1.65'},'.cm-gutters':{backgroundColor:'#f3f1e9',color:'#938b7a',borderRight:'1px solid #e1ddd3'},'&.cm-focused':{outline:'2px solid #c5ac35',outlineOffset:'2px'},'.cm-activeLine':{backgroundColor:'#f8f5e9'}})]})});
 return {highlightDifferences(lines){view.dispatch({effects:setDifferences.of(lines)});},get value(){return view.state.doc.toString();},set value(text){view.dispatch({changes:{from:0,to:view.state.doc.length,insert:text}});},setDisabled(next){if(next===disabled)return;disabled=next;view.dispatch({effects:editable.reconfigure([EditorState.readOnly.of(next),EditorView.editable.of(!next)])});}};
}
