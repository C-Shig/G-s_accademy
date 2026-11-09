```mermaid
flowchart TD
    A["checkAchievements()"] --> B["discoveredPrimesを参照"]
    B --> C{"発見数が1以上?"}
    C -->|Yes| D["FIRST PRIME達成"]
    C -->|No| E["未達成"]
    D --> F["次の条件へ"]
    E --> F
    F --> G{"2,3,5,7をすべて発見?"}
    G -->|Yes| H["SINGLE DIGIT MASTER達成"]
    G -->|No| I["未達成"]
    H --> J["次の条件へ"]
    I --> J
    J --> K{"異なる素数が10個以上?"}
    K -->|Yes| L["PRIME COLLECTOR達成"]
    K -->|No| M["未達成"]
    L --> N["次の条件へ"]
    M --> N
    N --> O{"差が2の素数ペアが存在?"}
    O -->|Yes| P["TWIN PRIME HUNTER達成"]
    O -->|No| Q["未達成"]
    P --> R["判定結果を返す"]
    Q --> R