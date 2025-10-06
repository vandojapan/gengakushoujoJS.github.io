function log(...args){
  const consoleElement=document.getElementById("console");
  if(consoleElement){
    consoleElement.textContent+=args.join(" ")+"\n";
    consoleElement.scrollTop=consoleElement.scrollHeight;
  }
  console.log(...args);
}

function formatCommandForLog(command){
  if(!command)return "";
  const params=Array.isArray(command.parameters)&&command.parameters.length>0
    ? ` params:${command.parameters.join(",")}`
    : "";
  const text=command.string&&command.string.length>0?` text:${command.string}`:"";
  return `${params}${text}`.trim();
}

let nextInterpreterId=1;

export class EventInterpreter{
  constructor(commands=[],options={}){
    this.id=options.id??nextInterpreterId++;
    this.parent=options.parent??null;
    const parentShared=this.parent?this.parent.sharedState:null;
    const sharedStateOption=options.sharedState??parentShared;
    this.sharedState=sharedStateOption??{labels:new Map()};
    if(!this.sharedState.labels)this.sharedState.labels=new Map();
    this.hooks=options.hooks??null;
    this.logger=options.logger??log;
    this.logPrefix=options.logPrefix??`[EventInterpreter#${this.id}]`;
    this.commands=Array.isArray(commands)?Array.from(commands):[];
    this.index=0;
    this.done=this.commands.length===0;
    this.labels=new Map(options.labels??[]);
    this.threadChildren=[];
    this._threadSeq=1;
  }

  log(...args){
    this.logger(this.logPrefix,...args);
  }

  currentCommand(){
    return this.commands[this.index]??null;
  }

  isComplete(){
    return this.done&&this.threadChildren.length===0;
  }

  step(){
    if(this.done)return false;
    if(this.index>=this.commands.length){
      this.done=true;
      return false;
    }
    const command=this.commands[this.index];
    const currentIndex=this.index;
    const handler=Maniacs[command.code];
    let result;
    if(handler){
      result=handler(this,command,currentIndex);
    }else{
      this.log(`[Event]${command.code}`,formatCommandForLog(command));
    }
    if(result&&typeof result.nextIndex==="number"){
      this.index=result.nextIndex;
    }else if(result&&typeof result.jumpTo==="number"){
      this.index=result.jumpTo;
    }else if(result&&result.repeat){
      // stay on the same command
    }else{
      this.index++;
    }
    if(this.index>=this.commands.length){
      this.done=true;
    }
    return true;
  }

  tick(){
    if(!this.done){
      this.step();
    }
    this.threadChildren=this.threadChildren.filter(thread=>{
      thread.tick();
      return !thread.isComplete();
    });
  }

  run(maxIterations=100000){
    let iterations=0;
    while(!this.isComplete()&&iterations<maxIterations){
      this.tick();
      iterations++;
    }
    return this.isComplete();
  }

  registerLabel(entry){
    if(!entry||!entry.name)return null;
    const previousLocal=this.labels.get(entry.name)??null;
    this.labels.set(entry.name,entry);
    const sharedLabels=this.sharedState.labels;
    let previousShared=null;
    if(sharedLabels){
      previousShared=sharedLabels.get(entry.name)??null;
      sharedLabels.set(entry.name,{...entry,owner:this});
    }
    if(this.hooks&&typeof this.hooks.onLabelDefined==="function"){
      this.hooks.onLabelDefined(entry,previousShared??previousLocal??null,this);
    }
    return previousLocal??previousShared??null;
  }

  getLabel(name){
    if(!name)return null;
    return this.labels.get(name)??this.sharedState.labels?.get(name)??null;
  }

  startThread(commands,options={}){
    if(!commands||commands.length===0)return null;
    const thread=new EventInterpreter(commands,{
      ...options,
      parent:this,
      sharedState:this.sharedState,
      hooks:this.hooks,
      logger:options.logger??this.logger,
      logPrefix:options.logPrefix??`${this.logPrefix}>T${this._threadSeq++}`
    });
    this.threadChildren.push(thread);
    if(this.hooks&&typeof this.hooks.onThreadStart==="function"){
      this.hooks.onThreadStart(thread,this);
    }
    return thread;
  }

  extractThreadBlock(startIndex){
    const threadCommands=[];
    let nextIndex=this.commands.length;
    let depth=0;
    for(let i=startIndex+1;i<this.commands.length;i++){
      const cmd=this.commands[i];
      if(!cmd)continue;
      if(cmd.code===22010){
        depth++;
        threadCommands.push(cmd);
        continue;
      }
      if(cmd.code===22011){
        if(depth===0){
          nextIndex=i+1;
          break;
        }
        depth=Math.max(0,depth-1);
        threadCommands.push(cmd);
        continue;
      }
      threadCommands.push(cmd);
    }
    if(nextIndex===this.commands.length){
      this.log("[Warn]ThreadEnd not found for ThreadStart at",startIndex);
    }
    return{commands:threadCommands,nextIndex};
  }
}

function createLoggingHandler(code,name){
  return function loggingHandler(interpreter,command){
    const logger=interpreter?interpreter.log.bind(interpreter):log;
    logger(`[Maniacs]${code} ${name}`,formatCommandForLog(command));
    return null;
  };
}

function handleThreadStart(interpreter,command,commandIndex){
  if(!interpreter){
    log("[Maniacs]22010 ThreadStart",formatCommandForLog(command));
    return null;
  }
  const {commands:threadCommands,nextIndex}=interpreter.extractThreadBlock(commandIndex);
  interpreter.log(`[Maniacs]22010 ThreadStart`,`commands:${threadCommands.length}`);
  if(threadCommands.length>0){
    interpreter.startThread(threadCommands);
  }
  return{nextIndex};
}

function handleLabelDefineEx(interpreter,command,commandIndex){
  const name=(command?.string??"").trim();
  if(!interpreter){
    log("[Maniacs]12410 LabelDefineEx",name);
    return null;
  }
  if(!name){
    interpreter.log("[Maniacs]12410 LabelDefineEx","ignored empty label");
    return null;
  }
  const entry={
    name,
    index:commandIndex+1,
    indent:command.indent??0,
    command
  };
  const previous=interpreter.registerLabel(entry);
  if(previous){
    interpreter.log(`[Maniacs]12410 LabelDefineEx`,`overwrote "${name}" -> ${entry.index}`);
  }else{
    interpreter.log(`[Maniacs]12410 LabelDefineEx`,`"${name}" -> ${entry.index}`);
  }
  return null;
}

export const Maniacs={
  11070:createLoggingHandler("11070","ScreenEffectEx"),
  11330:createLoggingHandler("11330","ShowPictureEx"),
  11410:createLoggingHandler("11410","BlendPicture"),
  11510:createLoggingHandler("11510","PlayBGMEx"),
  11550:createLoggingHandler("11550","PlaySEEx"),
  11610:createLoggingHandler("11610","PictureMoveEx"),
  12010:createLoggingHandler("12010","VariableOperationEx"),
  12410:handleLabelDefineEx,
  22010:handleThreadStart,
  22011:createLoggingHandler("22011","ThreadEnd"),
  22410:createLoggingHandler("22410","LabelCallEx")
};

export function executeEventCommand(interpreterOrCommand,maybeCommand){
  let interpreter=interpreterOrCommand;
  let command=maybeCommand;
  if(maybeCommand===undefined){
    interpreter=null;
    command=interpreterOrCommand;
  }
  if(!command)return null;
  const handler=Maniacs[command.code];
  if(!handler){
    const logger=interpreter?interpreter.log.bind(interpreter):log;
    logger(`[Event]${command.code}`,formatCommandForLog(command));
    return null;
  }
  return handler(interpreter,command,interpreter?interpreter.index:0);
}

export function parseParameters(text){
  if(!text)return[];
  const trimmed=text.trim();
  if(!trimmed)return[];
  return trimmed.split(/\s+/).map(value=>{
    const num=Number(value);
    return Number.isNaN(num)?value:num;
  });
}

export function parseEventCommands(commandsNode){
  if(!commandsNode)return[];
  const nodes=commandsNode.querySelectorAll("EventCommand");
  return Array.from(nodes).map(node=>{
    const codeText=node.querySelector("code")?.textContent??"0";
    const indentText=node.querySelector("indent")?.textContent??"0";
    const stringValue=node.querySelector("string")?.textContent??"";
    const parametersText=node.querySelector("parameters")?.textContent??"";
    return{
      code:Number(codeText),
      indent:Number(indentText),
      string:stringValue,
      parameters:parseParameters(parametersText)
    };
  });
}
