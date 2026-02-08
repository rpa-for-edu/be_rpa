import { Injectable, Logger } from '@nestjs/common';
import { ParsedKeyword, ParsedClass } from '../entity/activity-package.entity';

@Injectable()
export class PythonParserService {
  private readonly logger = new Logger(PythonParserService.name);

  /**
   * Parse Python file content to extract Robot Framework keywords
   */
  async parseLibraryFile(fileContent: string): Promise<{
    keywords: ParsedKeyword[];
    classes: ParsedClass[];
    imports: string[];
  }> {
    try {
      const keywords = this.extractKeywords(fileContent);
      const classes = this.extractClasses(fileContent);
      const imports = this.extractImports(fileContent);

      return { keywords, classes, imports };
    } catch (error) {
      this.logger.error('Failed to parse library file', error);
      throw error;
    }
  }

  /**
   * Extract @keyword decorated methods
   */
  private extractKeywords(content: string): ParsedKeyword[] {
    const keywords: ParsedKeyword[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Find @keyword decorator
      if (line.startsWith('@keyword(') || line === '@keyword') {
        const keywordNameMatch = line.match(/@keyword\(['"](.+?)['"]\)/);
        const keywordName = keywordNameMatch ? keywordNameMatch[1] : null;

        // Next line should be the method definition
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('def ')) {
          j++;
        }

        if (j < lines.length) {
          const methodLine = lines[j].trim();
          const methodMatch = methodLine.match(/def\s+(\w+)\s*\((.*?)\)/);
          
          if (methodMatch) {
            const methodName = methodMatch[1];
            const argsString = methodMatch[2];
            const args = this.parseMethodArgs(argsString);

            // Extract docstring
            let docstring = '';
            let k = j + 1;
            if (k < lines.length && lines[k].trim().startsWith('"""')) {
              const docLines = [];
              k++;
              while (k < lines.length && !lines[k].trim().endsWith('"""')) {
                docLines.push(lines[k].trim());
                k++;
              }
              docstring = docLines.join('\n').trim();
            }

            keywords.push({
              name: keywordName || this.methodNameToKeywordName(methodName),
              methodName,
              args,
              docstring,
              lineNumber: j + 1,
            });
          }
        }
      }
    }

    return keywords;
  }

  /**
   * Extract class definitions
   */
  private extractClasses(content: string): ParsedClass[] {
    const classes: ParsedClass[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('class ')) {
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          const className = classMatch[1];
          let initArgs = [];
          let methods = [];
          let j = i + 1;
          let docstring = '';

          // Extract docstring
          if (j < lines.length && lines[j].trim().startsWith('"""')) {
            const docLines = [];
            j++;
            while (j < lines.length && !lines[j].trim().endsWith('"""')) {
              docLines.push(lines[j].trim());
              j++;
            }
            docstring = docLines.join('\n').trim();
            j++;
          }

          // Find methods
          while (j < lines.length && !lines[j].startsWith('class ')) {
            const methodLine = lines[j].trim();
            if (methodLine.startsWith('def ')) {
              const methodMatch = methodLine.match(/def\s+(\w+)\s*\((.*?)\)/);
              if (methodMatch) {
                const methodName = methodMatch[1];
                methods.push(methodName);

                if (methodName === '__init__') {
                  initArgs = this.parseMethodArgs(methodMatch[2]);
                }
              }
            }
            j++;
          }

          classes.push({
            name: className,
            methods,
            initArgs,
            docstring,
          });
        }
      }
    }

    return classes;
  }

  /**
   * Extract import statements
   */
  private extractImports(content: string): string[] {
    const imports = new Set<string>();
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // import xxx
      const importMatch = trimmed.match(/^import\s+(\w+)/);
      if (importMatch) {
        imports.add(importMatch[1]);
      }

      // from xxx import yyy
      const fromMatch = trimmed.match(/^from\s+(\w+)/);
      if (fromMatch) {
        imports.add(fromMatch[1]);
      }
    }

    return Array.from(imports);
  }

  /**
   * Parse method arguments
   */
  private parseMethodArgs(argsString: string): Array<{
    name: string;
    type?: string;
    default?: any;
  }> {
    if (!argsString || argsString.trim() === '') {
      return [];
    }

    const args = argsString.split(',').map(arg => arg.trim());
    const result = [];

    for (const arg of args) {
      if (arg === 'self') continue;

      let name = arg;
      let type = undefined;
      let defaultValue = undefined;

      // Handle type hints: arg: str = "default"
      if (arg.includes(':')) {
        const parts = arg.split(':');
        name = parts[0].trim();
        const typeAndDefault = parts[1].trim();

        if (typeAndDefault.includes('=')) {
          const typeParts = typeAndDefault.split('=');
          type = typeParts[0].trim();
          defaultValue = typeParts[1].trim();
        } else {
          type = typeAndDefault;
        }
      } else if (arg.includes('=')) {
        // Handle default without type: arg="default"
        const parts = arg.split('=');
        name = parts[0].trim();
        defaultValue = parts[1].trim();
      }

      result.push({
        name,
        type,
        default: defaultValue,
      });
    }

    return result;
  }

  /**
   * Convert method_name to "Method Name"
   */
  private methodNameToKeywordName(methodName: string): string {
    return methodName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate suggested templates from parsed keywords
   */
  generateSuggestedTemplates(keywords: ParsedKeyword[]): Array<{
    keywordName: string;
    displayName: string;
    inputSchema: any[];
    description: string;
  }> {
    return keywords.map(keyword => ({
      keywordName: keyword.name,
      displayName: keyword.name,
      inputSchema: keyword.args.map(arg => ({
        name: arg.name,
        type: this.inferInputType(arg.type),
        required: arg.default === undefined,
        default: arg.default,
        label: this.camelCaseToTitle(arg.name),
      })),
      description: keyword.docstring || `Execute ${keyword.name}`,
    }));
  }

  /**
   * Infer input type from Python type hint
   */
  private inferInputType(pythonType?: string): string {
    if (!pythonType) return 'string';
    
    const typeMap: Record<string, string> = {
      'str': 'string',
      'int': 'number',
      'float': 'number',
      'bool': 'boolean',
      'dict': 'object',
      'list': 'array',
    };

    return typeMap[pythonType.toLowerCase()] || 'string';
  }

  /**
   * Convert camelCase to Title Case
   */
  private camelCaseToTitle(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }
}
