# The Correctness Landscape

**Every tool for proving software does what it says.**

A comprehensive reference for developers, architects, and researchers navigating the world of formal verification, theorem proving, model checking, contract-based programming, and runtime proof.

*Last updated: March 2026*

---

## Why This Page Exists

Software correctness is not one problem — it's a spectrum of problems, each addressed by different tools with different tradeoffs. A theorem prover and a runtime assertion library both care about correctness, but they operate in fundamentally different ways, at different times, with different guarantees.

The challenge: these tools are scattered across academic papers, language ecosystems, and corporate research labs. No single resource maps the full landscape. If you're a developer who cares about writing correct software, you've had to piece this together yourself.

This page fixes that. Every major tool for software correctness, organized by what it does, when you'd use it, and how it compares to everything else.

---

## The Correctness Spectrum

All correctness tools live somewhere on this spectrum:

```
Hope it     Runtime      Property    Static      Type        Contract    Model       SMT         Deductive   Theorem
works       Checks       Testing     Analysis    Systems     Checking    Checking    Solving     Verification Proving
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────►
Less effort, less certainty                                                           More effort, more certainty
```

**Left side:** low effort, catches bugs in practice, no mathematical guarantees.
**Right side:** significant effort, proves properties hold for all possible inputs, mathematical certainty.

Most teams operate on the left. Safety-critical industries (aerospace, medical, nuclear) operate on the right. The interesting question is: where should *you* be?

---

## The Matrix

Every tool, one row. Sortable by what matters to you.

| Tool | Layer | Target | Automation | Proof Strength | Maturity | Notable Users | License |
|------|-------|--------|------------|----------------|----------|---------------|---------|
| [Lean 4](https://lean-lang.org/) | Theorem Prover | Mathematics, software | Interactive + tactics | Mathematical | Growing | Microsoft Research, academic | Apache 2.0 |
| [Rocq (Coq)](https://rocq-prover.org/) | Theorem Prover | Mathematics, software | Interactive + tactics | Mathematical | Battle-tested | Airbus, INRIA | LGPL 2.1 |
| [Isabelle/HOL](https://isabelle.in.tum.de/) | Theorem Prover | Mathematics, systems | Interactive + Sledgehammer | Mathematical | Battle-tested | NICTA/seL4 team, academic | BSD |
| [Agda](https://agda.readthedocs.io/) | Theorem Prover | Type theory, mathematics | Interactive (no tactics) | Mathematical | Production | Academic/PL research | BSD-like |
| [HOL4](https://hol-theorem-prover.org/) | Theorem Prover | Hardware, compilers | Interactive | Mathematical | Battle-tested | CakeML team, defense | BSD |
| [HOL Light](https://hol-light.github.io/) | Theorem Prover | Mathematics, crypto | Interactive | Mathematical | Production | AWS, Intel | BSD |
| [Mizar](http://mizar.org/) | Theorem Prover | Pure mathematics | Write-compile-correct | Mathematical | Battle-tested | Academic | GPL |
| [ACL2](https://www.cs.utexas.edu/~moore/acl2/) | Theorem Prover | Hardware, algorithms | Automated induction | Mathematical | Battle-tested | AMD, defense | BSD |
| [F*](https://fstar-lang.org/) | Verification Language | Crypto, protocols, systems | Semi-automatic (Z3) | Mathematical | Production | Microsoft Research, Mozilla | Apache 2.0 |
| [Dafny](https://dafny.org/) | Verification Language | General-purpose | Semi-automatic (Z3) | Mathematical | Production | Microsoft, Amazon | MIT |
| [Whiley](https://whiley.org/) | Verification Language | General-purpose → JVM | Automatic (Boogie/Z3) | Mathematical | Research | Academic | BSD |
| [Idris 2](https://www.idris-lang.org/) | Verification Language | General-purpose | Mixed (types + tactics) | Mathematical | Growing | Academic | BSD |
| [Liquid Haskell](https://ucsd-progsys.github.io/liquidhaskell/) | Verification Language | Haskell programs | Automatic (Z3) | Mathematical | Production | Academic, industry | BSD |
| [Ada/SPARK](https://www.adacore.com/about-spark) | Contract Verification | Safety-critical embedded | Automatic (CVC5/Z3) | Mathematical | Battle-tested | NVIDIA, Thales, Airbus | GPL + commercial |
| [Eiffel](https://www.eiffel.org/) | Contract Verification | General OOP | Runtime + AutoProof | Runtime / Mathematical | Production | Finance, defense | GPL + commercial |
| [Gateproof](https://gateproof.dev/) | Runtime Proof | TypeScript/JavaScript | Automatic | Runtime (continuous) | Growing | Open source | MIT |
| [Z3](https://github.com/Z3Prover/z3) | SMT Solver | Foundation for other tools | Fully automatic | Mathematical | Battle-tested | Azure, everyone | MIT |
| [cvc5](https://cvc5.github.io/) | SMT Solver | Foundation for other tools | Fully automatic | Mathematical | Production | AWS, Google, NASA | BSD |
| [TLA+](https://lamport.azurewebsites.net/tla/tla.html) | Specification/Modeling | Distributed systems | Model checking (TLC) | Bounded + proof (TLAPS) | Battle-tested | AWS, Microsoft, CrowdStrike | MIT |
| [Alloy](https://alloytools.org/) | Specification/Modeling | Software design | Fully automatic (SAT) | Bounded | Production | Academic, industry | MIT |
| [SPIN](http://spinroot.com/) | Model Checker | Concurrent protocols | Fully automatic | Exhaustive (bounded) | Battle-tested | Bell Labs, telecom | Open source |
| [CBMC](https://www.cprover.org/cbmc/) | Model Checker | C/C++ programs | Fully automatic | Bounded | Production | Diffblue, Linux kernel | BSD |
| [NuSMV/nuXmv](https://nuxmv.fbk.eu/) | Model Checker | Hardware, finite-state | Fully automatic | Exhaustive | Production | Hardware industry | LGPL |
| [UPPAAL](https://uppaal.org/) | Model Checker | Real-time systems | Fully automatic | Exhaustive | Production | Embedded systems industry | Academic/commercial |
| [Frama-C](https://www.frama-c.com/) | C Verification | C programs | Semi-automatic | Mathematical | Battle-tested | Airbus, nuclear, space | LGPL |
| [VeriFast](https://github.com/verifast/verifast) | C/Java/Rust Verification | Heap/concurrent code | Semi-automatic | Mathematical | Production | Belgian eID, academic | MIT |
| [Infer](https://fbinfer.com/) | Static Analysis | Java, C, C++, ObjC, Erlang | Fully automatic | Heuristic | Battle-tested | Meta, Amazon, Spotify | MIT |
| [KeY](https://www.key-project.org/) | Java Verification | Java programs (JML) | Semi-automatic | Mathematical | Production | Academic, JDK verification | GPL |
| [Why3](https://www.why3.org/) | Verification Infrastructure | Multi-language (via IR) | Semi-automatic | Mathematical | Production | AdaCore (SPARK), Inria | LGPL |
| [Verus](https://github.com/verus-lang/verus) | Rust Verification | Rust programs | Semi-automatic (Z3) | Mathematical | Growing | CMU, Microsoft, Asterinas | MIT |
| [Kani](https://github.com/model-checking/kani) | Rust Verification | Rust (including unsafe) | Fully automatic | Bounded | Growing | AWS, Rust stdlib | Apache 2.0 + MIT |
| [Creusot](https://github.com/creusot-rs/creusot) | Rust Verification | Rust programs | Semi-automatic (Why3) | Mathematical | Research | Inria | LGPL |
| [Prusti](https://www.pm.inf.ethz.ch/research/prusti.html) | Rust Verification | Rust programs | Semi-automatic (Viper) | Mathematical | Growing | ETH Zurich | MPL 2.0 |
| [Move Prover](https://aptos.dev/en/build/smart-contracts/prover) | Smart Contract Verification | Move (Aptos/Sui) | Semi-automatic (Z3) | Mathematical | Production | Aptos, Sui | Apache 2.0 |
| [Certora](https://www.certora.com/) | Smart Contract Verification | EVM/Solana/Stellar | Semi-automatic (SMT) | Mathematical | Production | Aave, Uniswap, Lido | Open source |

---

## Deep Dives

### 1. Theorem Provers and Proof Assistants

**What this is:** Software for constructing and mechanically checking mathematical proofs. You state a theorem, build a proof step by step, and the system verifies every logical step.

**When you'd reach for it:** When you need absolute certainty — verified compilers, verified OS kernels, verified cryptography, or formalizing mathematics itself.

#### Lean 4
[lean-lang.org](https://lean-lang.org/) · [GitHub](https://github.com/leanprover/lean4)

The fastest-growing proof assistant. Lean 4 is both a theorem prover and a general-purpose functional programming language — the system is written in itself. Its killer feature is **Mathlib**, the largest unified library of formalized mathematics (~200,000 theorems). The community has formalized results in number theory, topology, measure theory, and combinatorics. Microsoft Research backs development. Lean 4's metaprogramming framework means users extend the system in the same language they write proofs in, and its tactic mode makes interactive proof construction surprisingly ergonomic.

#### Rocq (formerly Coq)
[rocq-prover.org](https://rocq-prover.org/) · [GitHub](https://github.com/coq/coq)

The elder statesman. Based on the Calculus of Inductive Constructions, Rocq has been the backbone of landmark verification efforts for decades. It powers **CompCert**, the only optimizing C compiler where Csmith (a compiler fuzzer) found zero wrong-code bugs. It can extract executable OCaml or Haskell code directly from proofs — write the proof, get a correct program for free. Rebranded from "Coq" to "Rocq" in 2024. The tactic language (Ltac/Ltac2) is powerful but has a steep learning curve. Recent work integrates LLM-guided proof generation, reaching ~80% success on textbook problems.

#### Isabelle/HOL
[isabelle.in.tum.de](https://isabelle.in.tum.de/)

Isabelle's superpower is **Sledgehammer**: point it at a goal, and it dispatches to external automated theorem provers and SMT solvers (E, Vampire, SPASS, Z3, cvc5) to find a proof. This makes Isabelle one of the most automated interactive provers. Its declarative proof language, **Isar**, reads closer to mathematical prose than tactic scripts. Isabelle verified the **seL4 microkernel** — the first formally verified general-purpose OS kernel, with 200,000+ lines of proof for 7,500 lines of C. The **Archive of Formal Proofs** is a massive curated library of verified results.

#### Agda
[agda.readthedocs.io](https://agda.readthedocs.io/)

Agda doesn't use tactics. Instead, proofs are programs — you write proof terms directly, using dependent types and the Curry-Howard correspondence. This makes it a "laboratory for type theory" where ideas get prototyped before spreading to other systems. Total by default (all programs must terminate). Haskell-like syntax. If you're doing programming language theory research, Agda is likely your tool.

#### HOL4
[hol-theorem-prover.org](https://hol-theorem-prover.org/)

Built on just 5 axioms and 8 primitive inference rules. Powers the **CakeML** project — a fully verified compiler for an ML-like language, with end-to-end correctness from source code to machine code. Also used to formalize x86, ARM, and POWER ISA semantics. The **Candle** project uses HOL4 to prove the soundness of HOL Light, creating a trust chain between provers.

#### HOL Light
[hol-light.github.io](https://hol-light.github.io/)

Possibly the smallest trusted kernel of any mainstream proof assistant: 3 axioms, 10 primitive inference rules. Created by John Harrison (Intel, then AWS). Used for the **Flyspeck** project that machine-checked the proof of the Kepler conjecture. AWS uses it to verify **s2n-bignum**, their cryptographic bignum library.

#### Mizar
[mizar.org](http://mizar.org/)

Founded in 1973 — one of the oldest proof systems. Its language is designed to read like mathematical prose. The **Mizar Mathematical Library** contains 52,000+ theorems across 1,150+ articles, making it one of the largest bodies of formalized mathematics. Not based on type theory (uses Tarski-Grothendieck set theory). No tactics — proofs are written in a declarative "write, compile, fix" loop.

#### ACL2
[cs.utexas.edu/~moore/acl2](https://www.cs.utexas.edu/~moore/acl2/)

An automated theorem prover built on an applicative subset of Common Lisp. Programs are both executable code and logical definitions. Won the 2005 ACM Software System Award. AMD uses it for hardware verification. The automation is powerful — ACL2's heuristics for inductive proofs can discharge complex goals without human guidance, making it more automatic than most proof assistants.

---

### 2. Verification-Oriented Programming Languages

**What this is:** Languages designed so that specifications (preconditions, postconditions, invariants) are part of the code. A verifying compiler proves your code meets its specs before it runs.

**When you'd reach for it:** When you want correctness guarantees integrated into your development workflow, not as a separate step.

#### F*
[fstar-lang.org](https://fstar-lang.org/)

F* bridges the gap between a real programming language and a proof assistant. Its refined dependent type system lets you express specifications inline, and Z3 discharges the proof obligations. The crown jewel is **HACL*/EverCrypt** — a verified cryptographic library extracted from F* that's used in Firefox, the Linux kernel, Python, WireGuard, and Tezos. The **Low*** sublanguage compiles to C with no garbage collection. **EverParse** parsers validate every Azure network packet. Developed by Microsoft Research and INRIA.

#### Dafny
[dafny.org](https://dafny.org/) · [GitHub](https://github.com/dafny-lang/dafny)

Created by Rustan Leino at Microsoft Research. Dafny is the closest thing to a "verifying compiler" that targets mainstream languages — it compiles to C#, Java, JavaScript, Go, and Python. You write preconditions, postconditions, loop invariants, and termination measures alongside your code. The verifier (Boogie + Z3) runs continuously as you type. An emerging research direction: LLMs write Dafny as a verified intermediary, prove it correct, then compile to the target language — making Dafny a "verification bridge" for AI-generated code.

#### Idris 2
[idris-lang.org](https://www.idris-lang.org/)

Where Rocq and Agda prioritize proofs, Idris prioritizes programming. Full dependent types with quantitative type theory (which subsumes linear types). You get compile-time correctness guarantees without leaving the world of practical programming. Compiles via Chez Scheme, Racket, or C. Aggressively erases proof terms at runtime so they don't cost performance. Led by Edwin Brady at University of St Andrews.

#### Liquid Haskell
[ucsd-progsys.github.io/liquidhaskell](https://ucsd-progsys.github.io/liquidhaskell/)

Retrofits verification onto Haskell via refinement types — logical predicates that constrain values. Available as a GHC plugin (`cabal install liquidhaskell`). Z3 checks the refinements automatically. Proves 96% of recursive functions terminating with only 1.7 lines of annotation per 100 lines of code. Has verified 10,000+ lines from production Haskell libraries (containers, text, vector-algorithms, xmonad).

#### Whiley
[whiley.org](https://whiley.org/)

Born from Tony Hoare's 2003 "Verifying Compiler Grand Challenge." Designed from scratch to make verification tractable — not retrofitted onto an existing language. Structural typing, reference lifetimes (Rust-inspired), and type invariants. Compiles to JVM. Smaller community than Dafny or F*, but explores interesting design space.

---

### 3. Contract-Based Verification

**What this is:** Systems where correctness contracts (preconditions, postconditions, invariants) are first-class citizens — checked at compile time, runtime, or both.

**When you'd reach for it:** When you want correctness guarantees without rewriting your codebase in a verification-oriented language.

#### Ada/SPARK
[adacore.com/about-spark](https://www.adacore.com/about-spark)

The gold standard for safety-critical software. SPARK is a subset of Ada where contracts are proven statically by the **GNATprove** tool (backed by CVC5 and Z3). Under DO-178C (avionics certification), SPARK proofs satisfy up to 70% of verification objectives *without runtime testing*. NVIDIA uses Ada/SPARK for highest-criticality GPU firmware. NSA recommends Ada for memory safety. Used in avionics, defense, medical devices, nuclear plants, and space systems. The 2025 **Marmaragan** tool uses LLMs to generate SPARK annotations automatically.

#### Eiffel
[eiffel.org](https://www.eiffel.org/)

Eiffel *invented* Design by Contract in the 1980s. Preconditions (`require`), postconditions (`ensure`), and class invariants (`invariant`) are language keywords, not annotations. Contracts are checked at runtime by default. The **AutoProof** tool (ETH Zurich) can prove contracts statically. The DbC concept Eiffel pioneered has influenced C# Code Contracts, D, Python's icontract, and dozens of other systems.

#### Gateproof
[gateproof.dev](https://gateproof.dev/)

Runtime proof for TypeScript. Where SPARK proves contracts at compile time, Gateproof proves them continuously at runtime — asserting that system behavior matches declared contracts in production. Designed for the gap where static verification is impractical (dynamic languages, external dependencies, distributed state) but you still want more than hope. Open source, MIT licensed.

---

### 4. SMT Solvers

**What this is:** Engines that determine whether logical formulas (involving integers, bit-vectors, arrays, strings, and more) are satisfiable. These are the *foundation* underneath most automated verification tools.

**When you'd reach for it:** You usually don't use these directly. But if you're building a verification tool, you almost certainly build on one of these.

#### Z3
[github.com/Z3Prover/z3](https://github.com/Z3Prover/z3)

The most widely used SMT solver in the world. Developed by Microsoft Research. Powers Dafny, F*, Verus, Prusti, VeriFast, SPARK, and dozens of others. Azure uses Z3 to verify firewall configurations — a task estimated at "millions of years" without it, completed in under a second with it. Won the ACM SIGPLAN Software Award (2015), ETAPS Test of Time Award (2018), and Herbrand Award (2019). MIT-licensed since 2015.

#### cvc5
[cvc5.github.io](https://cvc5.github.io/)

Z3's main competitor. Joint project of Stanford and Iowa. Supports all SMT-LIB theories plus extensions like finite fields and syntax-guided synthesis. Can output proofs in LFSC, Alethe, and **Lean 4** formats — directly feeding proof assistants. Supports abductive reasoning (constructing missing hypotheses). Sponsored by AWS, DARPA, Google, Intel, Meta, and NASA.

---

### 5. Model Checkers

**What this is:** Tools that exhaustively explore every reachable state of a system model to check whether a property holds. If it doesn't, you get a concrete counterexample.

**When you'd reach for it:** When you need to find bugs in concurrent protocols, distributed algorithms, hardware designs, or stateful systems — and you want the tool to search automatically.

#### SPIN
[spinroot.com](http://spinroot.com/)

Won the 2001 ACM System Software Award. Created by Gerard Holzmann at Bell Labs in 1980. Models are written in **PROMELA**, and SPIN generates a custom C verifier for your specific model — giving excellent performance. Bitstate hashing enables verification of very large state spaces with memory tradeoffs. The canonical tool for verifying concurrent protocols.

#### CBMC
[cprover.org/cbmc](https://www.cprover.org/cbmc/)

Bounded model checker that works directly on C and C++ source code. Translates programs (with loops unrolled to a fixed depth) into SAT/SMT formulas. If satisfiable, there's a real execution that violates your assertion. Used to verify Linux kernel code. Variants include **JBMC** (Java bytecode) and **Kani** (Rust, developed by AWS).

#### NuSMV / nuXmv
[nuxmv.fbk.eu](https://nuxmv.fbk.eu/)

Symbolic model checkers using BDDs and SAT/SMT. NuSMV handles finite-state systems; nuXmv extends to infinite-state (integers, reals) via MathSAT5. Used for hardware verification, requirements analysis, and safety assessment. Designed as an open backend that other tools can build on.

#### UPPAAL
[uppaal.org](https://uppaal.org/)

Specialized for **real-time systems** modeled as networks of timed automata. Verifies safety, bounded liveness, and deadlock freedom with real-valued clock constraints. Extensions include cost-optimal reachability (Cora), online conformance testing (Tron), and timed game synthesis (Tiga). Used for audio protocols, gearbox controllers, and embedded systems.

---

### 6. Specification and Modeling Languages

**What this is:** Languages for designing and analyzing systems *before* writing code. You model the system, state properties it should satisfy, and a tool checks whether the design is correct.

**When you'd reach for it:** When you're designing a distributed system, protocol, or complex stateful system and want to find design bugs before implementation.

#### TLA+
[learntla.com](https://learntla.com/) · [lamport.azurewebsites.net/tla](https://lamport.azurewebsites.net/tla/tla.html)

Created by Turing Award winner Leslie Lamport. The lingua franca for distributed systems design. Specifications use mathematical logic and set theory. The **TLC** model checker exhaustively explores finite state spaces; **TLAPS** handles infinite-state proofs. AWS uses TLA+ extensively and credits it with finding critical bugs in S3, DynamoDB, and EBS. Microsoft found an Xbox 360 memory bug with it. CrowdStrike uses it. Now maintained by the TLA+ Foundation.

#### Alloy
[alloytools.org](https://alloytools.org/)

"Lightweight formal methods" — fully automated, no interactive proving. You write declarative models in first-order relational logic, and Alloy's **Kodkod** engine finds instances or counterexamples within bounded scopes via SAT solving. Created by Daniel Jackson at MIT. Alloy 6 added temporal logic and mutable state. The philosophy: find bugs early through bounded exploration, rather than attempting full proofs.

---

### 7. C/C++ Verification

**What this is:** Tools specifically designed to verify properties of C and C++ code — from absence of undefined behavior to full functional correctness.

**When you'd reach for it:** When you're writing C/C++ and need guarantees beyond what the type system provides.

#### Frama-C
[frama-c.com](https://www.frama-c.com/)

A modular framework with interoperable plugins. **Eva** performs abstract interpretation for runtime error absence. **WP** does deductive verification of functional correctness using ACSL (ANSI/ISO C Specification Language) annotations and SMT solvers — proving 98% of verification conditions automatically on real-world code. **E-ACSL** checks annotations at runtime. Used for DO-178C (avionics), IEC 60880 (nuclear), and Common Criteria EAL 6-7 certification. Developed by CEA and Inria.

#### CompCert
[compcert.org](https://compcert.org/)

Not a verification tool — a *verified tool*. CompCert is an optimizing C compiler proven correct in Rocq/Coq: the compiled code behaves exactly as the source specifies. When Csmith (a compiler fuzzer that found hundreds of bugs in GCC and LLVM) was run against CompCert, it found zero wrong-code bugs. The gold standard for what a verified compiler looks like.

#### VeriFast
[github.com/verifast/verifast](https://github.com/verifast/verifast)

Semi-automated verification using **separation logic** — excels at reasoning about heap-manipulating and concurrent programs. Symbolically executes each function with separation logic annotations. Returns results in seconds. Verified crash-freedom of Belgium's eID card (Java Card), a Linux device driver, and lock-free concurrent algorithms. Won VerifyThis competitions in 2012 and 2016. Now supports Rust alongside C and Java.

---

### 8. Rust Verification

**What this is:** A rapidly growing ecosystem of tools that leverage Rust's ownership model to simplify formal verification of Rust programs.

**When you'd reach for it:** When Rust's type system isn't enough and you need to prove functional correctness, absence of panics, or correctness of unsafe code.

#### Verus
[github.com/verus-lang/verus](https://github.com/verus-lang/verus)

Extends Rust with specification annotations (`requires`, `ensures`) proved by Z3. Adds mathematical types (`int`, `nat`) for specifications while keeping executable code in standard Rust types. **AutoVerus** (OOPSLA 2025) uses LLM agents to generate proofs automatically — achieving 90%+ success on 150 non-trivial benchmarks. Used by the **Asterinas** project to verify a general-purpose OS kernel in Rust. Under active development at CMU, Microsoft, and others.

#### Kani
[github.com/model-checking/kani](https://github.com/model-checking/kani)

Bounded model checker for Rust built on CBMC. Symbolically verifies Rust programs including `unsafe` code blocks. Supports function contracts and `kani::any()` for nondeterministic inputs. Developed and open-sourced by AWS. Found 5 bugs in Firecracker's rate limiter. Being used to verify the Rust standard library. Fully automatic — no proofs to write, just assertions to check.

#### Creusot
[github.com/creusot-rs/creusot](https://github.com/creusot-rs/creusot)

Deductive verification backed by Why3's prover ecosystem. Novel "prophecy variables" for reasoning about memory mutation in harmony with Rust's ownership system. Leverages traits for specification abstraction. Can automatically infer contracts for simple closures. Developed at Inria.

#### Prusti
[pm.inf.ethz.ch/research/prusti.html](https://www.pm.inf.ethz.ch/research/prusti.html)

Built on the **Viper** intermediate verification language (ETH Zurich). Exploits Rust's ownership types to avoid exposing separation logic complexity to users. Available as a VS Code extension ("Prusti Assistant"). The Viper infrastructure also supports **Gobra** (Go) and **Nagini** (Python), creating a cross-language verification platform.

---

### 9. Java Verification

**What this is:** Tools for proving properties of Java programs, typically using the Java Modeling Language (JML) or separation logic annotations.

**When you'd reach for it:** When you need to verify Java code beyond what testing and static analysis provide.

#### KeY
[key-project.org](https://www.key-project.org/)

Deductive verification for Java using JML specifications. Transforms annotated Java into theorems of Java Dynamic Logic, then applies sequent calculus with symbolic execution. Found a bug in Java's standard library **TimSort** implementation and verified the fix. Also verified JDK's Dual Pivot Quicksort. Extensions include **KeYmaera X** for hybrid systems (cyber-physical systems with continuous dynamics).

#### Infer
[fbinfer.com](https://fbinfer.com/) · [GitHub](https://github.com/facebook/infer)

Meta's compositional static analyzer. Based on separation logic and bi-abduction. Runs on every code change at Meta across Facebook, Instagram, WhatsApp, and Messenger. Incremental — only re-analyzes changed code using cached summaries. **RacerD** detects concurrency races. Also used at Amazon, Spotify, and Mozilla. Designed to finish in 15-20 minutes on a diff. The team received the 2016 CAV Award. Supports Java, C, C++, Objective-C, and Erlang.

---

### 10. Smart Contract Verification

**What this is:** Tools for formally verifying blockchain smart contracts — where bugs directly lose money and deployed code is immutable.

**When you'd reach for it:** When you're deploying a smart contract that will hold or manage significant value.

#### Certora Prover
[certora.com](https://www.certora.com/)

Formal verification for EVM (Ethereum), Solana, and Stellar contracts. Works directly on compiled bytecode using the **CVL** (Certora Verification Language) specification language. Now free and open source. Secures over $100 billion in total value locked across Aave, MakerDAO, Uniswap, Lido, and EigenLayer. 70,000+ rules written by developers. Has detected bugs in the Solidity compiler itself.

#### Move Prover
[aptos.dev/en/build/smart-contracts/prover](https://aptos.dev/en/build/smart-contracts/prover)

Formal verifier for the Move language (Aptos, Sui blockchains). Move's resource-oriented type system (linear types) makes verification dramatically simpler than Solidity/EVM. The entire Diem blockchain framework was verified with it. The **Sui Prover** (open-sourced January 2026) extends this to the Sui ecosystem. Backed by Z3.

---

### 11. Verification Infrastructure

**What this is:** Intermediate languages and frameworks that other verification tools build on. You rarely use these directly, but they power the tools you do use.

**When you'd reach for it:** When you're building a verification tool or need to understand the architecture underneath one.

#### Why3
[why3.org](https://www.why3.org/)

An intermediate verification platform. Its **WhyML** language serves as a target for tools verifying C, Java, Rust, and Ada. Generates verification conditions and dispatches them to dozens of provers (Alt-Ergo, Z3, CVC5, Isabelle, Rocq). Powers **Creusot** (Rust), **SPARK/Ada** (via AdaCore), and others. If you're building a verification tool, targeting Why3 instead of building your own prover pipeline saves years of work.

#### Viper
[viper.ethz.ch](https://www.pm.inf.ethz.ch/research/viper.html)

ETH Zurich's verification infrastructure based on Implicit Dynamic Frames (a variant of separation logic). Backend for **Prusti** (Rust), **Gobra** (Go), and **Nagini** (Python). Two verification backends: symbolic execution and verification condition generation.

#### Boogie
[github.com/boogie-org/boogie](https://github.com/boogie-org/boogie)

Microsoft Research's intermediate verification language. Backend for **Dafny**, **VCC** (concurrent C), and **Spec#**. Translates annotated programs into Z3 queries. If Dafny is the user-facing language, Boogie is the engine underneath.

---

### 12. The Verification Stack

These tools don't compete — they layer:

```
┌──────────────────────────────────────────────────────────┐
│   Mathematical Proof                                     │
│   Lean 4, Rocq, Isabelle, Agda, HOL4                     │
│   "It's correct in all possible worlds"                  │
├──────────────────────────────────────────────────────────┤
│   Deductive Verification                                 │
│   Dafny, F*, SPARK, Frama-C, Verus                       │
│   "The code matches the specification"                   │
├──────────────────────────────────────────────────────────┤
│   Model Checking                                         │
│   TLA+, SPIN, CBMC, Alloy                                │
│   "The design has no reachable bad states"               │
├──────────────────────────────────────────────────────────┤
│   SMT Solving                                            │
│   Z3, cvc5                                               │
│   "This formula is (un)satisfiable"                      │
├──────────────────────────────────────────────────────────┤
│   Type Systems                                           │
│   Rust, Ada/SPARK, Haskell, Idris                        │
│   "The compiler rejects invalid programs"                │
├──────────────────────────────────────────────────────────┤
│   Static Analysis                                        │
│   Infer, Frama-C Eva, linters                            │
│   "This code has no common bug patterns"                 │
├──────────────────────────────────────────────────────────┤
│   Runtime Proof                                          │
│   Gateproof, Eiffel DbC, E-ACSL                         │
│   "It's correct right now, in production"                │
└──────────────────────────────────────────────────────────┘
```

The layers are complementary. A formally verified compiler (CompCert) guarantees correct compilation, but says nothing about whether the *specification* is right. A model checker (TLA+) guarantees the *design* is correct, but says nothing about the *implementation*. Runtime proof (Gateproof) guarantees the *system is behaving correctly now*, but says nothing about whether it *always* will.

The strongest systems combine layers. seL4 uses Isabelle (theorem proving) + C code (implementation) + proofs connecting them. HACL* uses F* (verification language) + extraction to C + testing in production.

---

## Decision Guide

### "Which tool should I use?"

**What are you trying to verify?**

| Goal | Start here |
|------|-----------|
| My distributed system design is correct | **TLA+** or **Alloy** |
| My C code has no undefined behavior | **Frama-C** or **CBMC** |
| My Rust code is functionally correct | **Verus** (full proofs) or **Kani** (bounded checking) |
| My Java code meets its contracts | **KeY** or **Infer** (for scale) |
| My algorithm is correct for all inputs | **Dafny** or **F*** |
| My smart contract won't lose funds | **Certora** (EVM) or **Move Prover** (Move) |
| My safety-critical embedded code is certified | **Ada/SPARK** |
| My mathematical theorem is true | **Lean 4** (growing ecosystem) or **Isabelle** (automation) or **Rocq** (extraction) |
| My Haskell code satisfies its invariants | **Liquid Haskell** |
| My production system is behaving correctly | **Gateproof** |
| My real-time system meets timing constraints | **UPPAAL** |
| My concurrent protocol is deadlock-free | **SPIN** |

**How much effort can you invest?**

| Effort Level | Tools |
|-------------|-------|
| **Minutes** (add assertions, run tool) | Kani, CBMC, Infer, Gateproof |
| **Hours** (write specs, annotate code) | Dafny, Liquid Haskell, Verus, TLA+ |
| **Days** (detailed specifications) | Frama-C WP, SPARK, Certora |
| **Weeks-months** (interactive proofs) | Lean 4, Rocq, Isabelle, F* |

---

## The LLM Frontier

The intersection of large language models and formal verification is producing surprising results:

- **AutoVerus** (OOPSLA 2025): LLM agents automatically generate Verus proofs for Rust code — 90%+ success rate on 150 non-trivial benchmarks.
- **Lean 4 copilots**: LLM-guided proof generation reaches ~80% success on Software Foundations textbook problems.
- **Dafny as verification bridge**: LLMs generate Dafny (which can be mechanically verified), then compile to target languages. The AI writes the code; the verifier guarantees it's correct.
- **Marmaragan**: Automatically generates SPARK annotations for Ada code using LLMs.
- **Rocq proof generation**: LLM-guided tactic search achieving significant success on standard library lemmas.

The pattern: LLMs are good at generating *candidate* proofs, and verification tools are good at *checking* them. The combination is more powerful than either alone. This may be how formal verification reaches mainstream developers — not by teaching everyone to write proofs, but by having AI write the proofs and machines check them.

---

## Hall of Fame: Notable Verified Systems

These are the landmark demonstrations that formal verification works at scale.

### seL4
The first formally verified general-purpose OS kernel. 8,700 lines of C, verified in Isabelle/HOL with 200,000+ lines of proof. Functional correctness, integrity, and confidentiality proved. Zero defects found in 15 years of verified code. [sel4.systems](https://sel4.systems/)

### CompCert
Verified optimizing C compiler, built in Rocq/Coq. Csmith (a compiler fuzzer that found hundreds of bugs in GCC and LLVM) found zero wrong-code bugs in CompCert. The only production compiler with this distinction. [compcert.org](https://compcert.org/)

### CakeML
Fully verified compiler for an ML-like language, built in HOL4. End-to-end correctness from source code to machine code — the proof covers parsing, type checking, optimization, and code generation. [cakeml.org](https://cakeml.org/)

### HACL* / EverCrypt
Verified cryptographic library written in F*, extracted to C. Used in Firefox, the Linux kernel, Python, mbedTLS, WireGuard, and Tezos. Covers Chacha20-Poly1305, Curve25519, AES-GCM, SHA-2, and more. Performance matches or exceeds hand-optimized C. [hacl-star.github.io](https://hacl-star.github.io/)

### s2n-bignum
Amazon's verified bignum library for cryptography. Verified in HOL Light — every line of hand-optimized assembly is proved to implement the correct mathematical function. Used in AWS cryptographic services. [github.com/awslabs/s2n-bignum](https://github.com/awslabs/s2n-bignum)

### EverParse
Verified parser generator from Microsoft Research, built in F*. Generates zero-copy C parsers that are proved to never read out of bounds, never produce incorrect results, and always terminate. Validates every Azure network packet in Hyper-V. [github.com/project-everest/everparse](https://github.com/project-everest/everparse)

---

## Further Reading

- [*Software Foundations*](https://softwarefoundations.cis.upenn.edu/) — The standard introduction to formal verification with Rocq/Coq
- [*Theorem Proving in Lean 4*](https://lean-lang.org/theorem_proving_in_lean4/) — Official Lean 4 textbook
- [*Practical TLA+*](https://learntla.com/) — Accessible introduction to TLA+
- [*The Hitchhiker's Guide to Logical Verification*](https://github.com/blanchette/logical_verification_2024) — Lean 4-based course from VU Amsterdam
- [*Certified Programming with Dependent Types*](http://adam.chlipala.net/cpdt/) — Advanced Rocq/Coq techniques by Adam Chlipala
- [Formal Methods in Practice](https://www.hillelwayne.com/post/formal-methods-in-practice/) — Hillel Wayne's practical overview
- [AWS and TLA+](https://lamport.azurewebsites.net/tla/amazon-excerpt.html) — How Amazon Web Services uses formal methods

---

*This page is a living document. If a tool is missing or a description is inaccurate, [open an issue](https://github.com/acoyfellow/coey.dev/issues).*
