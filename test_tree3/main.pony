use "term"
use "debug"
use "promises"
use "Collatz"
use "Rot13"
use "SternBrocot"

class WordHandler is ReadlineNotify
  let _commands: Array[String] = _commands.create()
  var _i: U64 = 0

  new iso create() =>
    _commands.push("quit")
    _commands.push("happy")
    _commands.push("hello")

  fun ref apply(line: String, prompt: Promise[String]) =>
    if line == "quit" then
      prompt.reject()
    else
      _i = _i + 1
      prompt(_i.string() + " > ")
    end
    _update_commands(line)

  fun ref _update_commands(line: String) =>
    for command in _commands.values() do
      if command.at(line, 0) then
        return
      end
    end

    _commands.push(line)

  fun ref tab(line: String): Seq[String] box =>
    let r = Array[String]

    for command in _commands.values() do
      if command.at(line, 0) then
        r.push(command)
      end
    end

    r

class CollatzHandler is ReadlineNotify
  var _i: U64 = 0
  fun ref apply(line: String, prompt: Promise[String]) =>
    if line == "quit" then
      prompt.reject()
    else
      var result = line + " "
      try
        let iterator = CollatzIterator[U64](line.u64()?)
        for num in iterator do
          result = result + num.string() + " "
        end
        // when you use '\n', every keydown will result in outputs again of (n-1)th apply().
        // result = result + "\n"
        _i = _i + 1
        prompt((result + _i.string()) + " > ")
      end
    end

class Rot13Handler is ReadlineNotify
  var _i: U64 = 0
  fun ref apply(line: String, prompt: Promise[String]) =>
    if line == "quit" then
      prompt.reject()
    else
      var result = Rot13.convert(line) + " "
      _i = _i + 1
      prompt((result + _i.string()) + " > ")
    end

class RatioHandler is ReadlineNotify
  var _i: U64 = 0
  fun ref apply(line: String, prompt: Promise[String]) =>
    if line == "quit" then
      prompt.reject()
    else
      try
        var result = SternBrocot.get_ratio(line.f64()?).string() + " "
        _i = _i + 1
        prompt((result + _i.string()) + " > ")
      else
        prompt("ERROR > ")
      end
    end

actor Repl
  new create(env: Env, handler: ReadlineNotify iso) =>
    env.out.print("Use 'quit' to exit.")

    // Building a delegate manually
    let term = ANSITerm(Readline(consume handler, env.out), env.input)
    term.prompt("0 > ")

    let notify = object iso
      let term: ANSITerm = term
      fun ref apply(data: Array[U8] iso) => term(consume data)
      fun ref dispose() => term.dispose()
    end

    env.input(consume notify)

actor Main
  let env: Env
  new create(env': Env) =>
    env = env'
    command(try env.args(1)? else "" end, env.args.slice(2))

  fun _print_usage() =>
    env.out.printv(
      [ "Usage: RandoriPony TASK [...]"
        ""
        "    Select a task."
        ""
        "Tasks:"
        "    help    - Print this message"
        "    word    - Rememver given word"
        "    collatz - Collatz Sequence"
        "    rot13   - Rot13 conversion"
        "    ratio   - get ratio out of 0.2777 or so"
        ""
      ]
    )

  fun command(task: String, rest: Array[String] box) =>
    match task
    | "word" =>
      Repl(env, WordHandler)
    | "collatz" =>
      Repl(env, CollatzHandler)
    | "rot13" =>
      Repl(env, Rot13Handler)
    | "ratio" =>
      Repl(env, RatioHandler)
    else
      _print_usage()
    end

// vim:expandtab ff=dos fenc=utf-8 sw=2

