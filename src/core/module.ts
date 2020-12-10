let nextId = 0;

export class Module {
  id: number;
  filename: string;
  content: string;
  dependencies: Module[];
  dependents: Module[];

  constructor(filename: string) {
    this.id = ++nextId;
    this.filename = filename;
    this.content = '';
    this.dependencies = [];
    this.dependents = [];
  }

  addDependency(mod: Module) {
    this.dependencies.push(mod);
    mod.dependents.push(this);
  }
}


