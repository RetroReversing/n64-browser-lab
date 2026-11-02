import reference from './data/mips-instructions.json' with {type:'json'};
export function instructionInfo(mnemonic){const name=String(mnemonic).trim().toLowerCase();return Object.hasOwn(reference.instructions,name)?reference.instructions[name]:null;}
export function instructionDescription(mnemonic){const info=instructionInfo(mnemonic);return info?`${String(mnemonic).trim().toUpperCase()}: ${info.description}`:null;}
