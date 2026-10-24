def denied (status : Nat) : Bool :=
  status == 302 || status == 401 || status == 403

axiom denied_302 : denied 302 = true
