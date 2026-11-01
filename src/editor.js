import {EditorState,Compartment} from '@codemirror/state';
import {EditorView,keymap,lineNumbers,highlightActiveLine,drawSelection,placeholder} from '@codemirror/view';
import {defaultKeymap,history,historyKeymap,indentWithTab} from '@codemirror/commands';
import {cpp} from '@codemirror/lang-cpp';
import {syntaxHighlighting,defaultHighlightStyle,bracketMatching,indentOnInput} from '@codemirror/language';
export function createCEditor(parent,onChange=()=>{}){
 const editable=new Compartment();let disabled=false;
 const view=new EditorView({parent,state:EditorState.create({extensions:[EditorView.updateListener.of(update=>{if(update.docChanged)onChange();}),cpp(),lineNumbers(),history(),drawSelection(),highlightActiveLine(),bracketMatching(),indentOnInput(),syntaxHighlighting(defaultHighlightStyle),placeholder('Pair with the desktop app and select a function to load its C source.'),keymap.of([...defaultKeymap,...historyKeymap,indentWithTab]),EditorView.contentAttributes.of({'aria-label':'Candidate C source'}),editable.of([EditorState.readOnly.of(false),EditorView.editable.of(true)]),EditorView.theme({'&':{fontSize:'13px',backgroundColor:'#fffefa',border:'1px solid #d3cec1',borderRadius:'3px'},'.cm-content':{fontFamily:'ui-monospace, monospace',minHeight:'280px',padding:'14px 0'},'.cm-scroller':{overflow:'auto',maxHeight:'650px',lineHeight:'1.65'},'.cm-gutters':{backgroundColor:'#f3f1e9',color:'#938b7a',borderRight:'1px solid #e1ddd3'},'&.cm-focused':{outline:'2px solid #c5ac35',outlineOffset:'2px'},'.cm-activeLine':{backgroundColor:'#f8f5e9'}})]})});
 return {get value(){return view.state.doc.toString();},set value(text){view.dispatch({changes:{from:0,to:view.state.doc.length,insert:text}});},setDisabled(next){if(next===disabled)return;disabled=next;view.dispatch({effects:editable.reconfigure([EditorState.readOnly.of(next),EditorView.editable.of(!next)])});}};
}
