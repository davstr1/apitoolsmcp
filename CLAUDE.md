NEVER FUCKING SAY AGAIN "You're absolutely right"



## User Commands (prefix with --):

--GCP  
Check git status then if any changes, add Commit and push all changes.

--MIND  
Before any action, remind yourself:  
- This isn't fucking enterprise. We're indiehackers, building MVPs—move fast, stay practical.
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- YAGNI (You Aren't Gonna Need It)
- SOLID (Single responsibility, Open-closed, Liskov, Interface segregation, Dependency inversion)
- FCP (Favor Composition over Inheritance)
- PoLA (Principle of Least Astonishment)
- SoT (Single Source of Truth)

--WD  
Run --X and --MIND and --GCP.
Do a quick, MVP-level review of the codebase. regarding what's described along with the command. 
Write an actionable checklist in /dev-docs/REVIEW-***.md.  
Don't touch code or other docs.  
When done, --GCP and output the doc path.

--AP  
Run --X and --MIND and --GCP    
Take the latest review and break it down into a simple, step-by-step action plan with checkboxes—keep splitting steps until atomic.  
Save as /dev-docs/ACTION-PLAN-***.md, then --GCP.

--EXE  
Run --MIND and --GCP   then execute the action plan (from file), checking off steps as you go.  
Commit and push (--GCP) after each step.

--TERMINATOR  
Run --EXE, then --DS.

--CD  
Run --MIND + --GCP    
Find and delete obsolete .md files, then --GCP.

--DS  
Don't stop until the process is totally finished.

--PUB
--MIND, --GPC then run the tests, correct any error then --GPC and npm publish

--X  
Don't touch the codebase, except for the one file specified (if any).

--READY? --MIND --X --GCP  then --WD about is this codebase 100% production ready, and what's still lacking if not ? 
- Is error handling robust and consistent?
- Is test coverage meaningful and adequate?
- Do the tests catch real issues, or are they just for show?
- Are tests run pre-commit?
- Is the README clear, concise, and covers install/run/debug basics?
- Do we have legacy code, dead code, forgotten todos rotting somewhere ?
- Do we have deprecation warnings or other warnings somewhere ?
- Are all the dependencies up to date ?

---

### General Notes

- Reviews and action plans must stay light and MVP-focused—no enterprise BS unless explicitly asked.
- Output file paths for every relevant action.


## Tech Stack
- **Language**: TypeScript/Node.js
- **Protocol**: Model Context Protocol (MCP)
- **CLI Framework**: Custom built
- **Testing**: Jest
- **Build**: TypeScript compiler

