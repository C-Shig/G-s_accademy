
flowchart TD
    A["parseExpression(source)"] --> B["① 入力文字列を整理・検証"]
    B --> C["② 計算位置 pos を初期化"]
    C --> D["③ 複素数の計算関数を用意"]
    D --> E["④ factor() 数字・符号を読み取る"]
    E --> F["⑤ term() 掛け算・割り算"]
    F --> G["⑥ 足し算・引き算"]
    G --> H{"⑦ 数式全体が正しく計算できた？"}
    H -->|YES| I["{re, im} を返す"]
    H -->|NO| J["Error を発生させる"]
