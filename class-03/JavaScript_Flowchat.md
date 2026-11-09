```mermaid
flowchart TD
    A["入力・チェックボタン"] --> B["checkPrime()"]
    B --> C["入力をNFKCで正規化"]
    C --> D["judgeNumber()"]
    D --> E["parseExpression()"]
    E --> F["isPrime()"]
    F --> G["判定結果オブジェクト"]
    G --> H{"primeFound?"}
    H -->|Yes| I["addPrime(number)"]
    H -->|No| J["既存の結果表示"]
    I --> K{"未登録の素数?"}
    K -->|No| J
    K -->|Yes| L["Setに追加"]
    L --> M["localStorageに保存"]
    M --> N["コレクション表示更新"]
    N --> O["Achievement条件を再判定"]
    O --> P{"新しく達成?"}
    P -->|Yes| Q["解除メッセージ表示"]
    P -->|No| J
    Q --> J
    J --> R["処理終了"]