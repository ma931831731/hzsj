# 《长夜之火》Unity 3D 项目初始化与架构落地指南

本文档指导如何将《长夜之火——4·8花园居火灾舆情处置演练》剧本快速导入 Unity 3D，并搭建具有电影级质感的 3D 演练系统。

---

## 一、 Unity 版本与渲染管线推荐

* **Unity 版本**：推荐使用 **Unity 2022.3 LTS** 或 **Unity 2023.2 LTS**。
* **渲染管线**：
  * **首选：URP (Universal Render Pipeline)** —— 兼具优秀的夜景光影反光（Screen Space Reflection）、Post-Processing 后期调色，且对各类政务汇报笔记本显卡非常友好，打包体积极小；
  * **备选：HDRP (High Definition Render Pipeline)** —— 如果用于大型高端展厅大屏，需要极度逼真的体积雾、次表面散射与实时光线追踪。

---

## 二、 推荐导入的核心官方插件包 (Package Manager)

通过 Unity 菜单栏 `Window -> Package Manager` 安装以下原生免费插件：
1. **Cinemachine**：实现无人机大景深俯瞰、越肩视角、特写对话的无缝平滑电影运镜；
2. **Visual Effect Graph (VFX Graph)**：实现 23 层火光向夜空喷涌、体积浓烟、碎玻璃随物理重力下落的特效；
3. **AI Navigation**：现代化的 3D NavMesh 寻路系统，实现角色点击地面自动躲避障碍物小跑移动；
4. **Input System (新版)**：支持键鼠、手柄和触屏控制；
5. **DOTween (Asset Store)**：用于 3D 手机通话抽屉、UI 弹窗的丝滑缓动动画。

---

## 三、 Unity 剧本数据载入器 (`ScenarioDataLoader.cs`)

将导出的 `Unity_Scenario_Data.json` 放入 Unity 项目的 `Assets/StreamingAssets/` 目录下，使用以下 C# 脚本直接加载：

```csharp
using System.IO;
using UnityEngine;

public class ScenarioDataLoader : MonoBehaviour
{
    public static ScenarioDataLoader Instance { get; private set; }
    public UnityScenarioPackage Database { get; private set; }

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);

        DontDestroyOnLoad(gameObject);
        LoadScenarioDatabase();
    }

    public void LoadScenarioDatabase()
    {
        string filePath = Path.Combine(Application.streamingAssetsPath, "Unity_Scenario_Data.json");
        if (File.Exists(filePath))
        {
            string jsonContent = File.ReadAllText(filePath);
            Database = JsonUtility.FromJson<UnityScenarioPackage>(jsonContent);
            Debug.Log($"[ScenarioDataLoader] 剧本数据库加载成功！包含 {Database.scenes.Length} 幕，共 {Database.roles.Length} 个核心角色。");
        }
        else
        {
            Debug.LogError($"[ScenarioDataLoader] 未在 StreamingAssets 中找到剧本文件: {filePath}");
        }
    }
}

// --- 数据结构映射类 ---
[System.Serializable]
public class UnityScenarioPackage
{
    public string version;
    public string project;
    public RoleData[] roles;
    public SceneData[] scenes;
}

[System.Serializable]
public class RoleData
{
    public string id;
    public string name;
    public string person;
    public string department;
    public string color;
}

[System.Serializable]
public class SceneData
{
    public int sceneId;
    public string title;
    public string timeSpan;
    public EventData[] events;
}

[System.Serializable]
public class EventData
{
    public string id;
    public string time;
    public string title;
    public string story;
    public ChoiceData[] choices;
}

[System.Serializable]
public class ChoiceData
{
    public string id;
    public string label;
}
```

---

## 四、 3D 场景与事件交互触发器 (`SpatialEventTrigger.cs`)

挂载在场景中需要互动的 3D 物体上（例如：西门违停的白色 SUV、警戒线、指挥帐篷）：

```csharp
using UnityEngine;

[RequireComponent(typeof(Collider))]
public class SpatialEventTrigger : MonoBehaviour
{
    [Header("绑定的事件ID (对应 Unity_Scenario_Data.json)")]
    public string targetEventId = "s1-d1";
    public string promptHint = "按 E 或走近触发决策：处理西门消防通道堵塞";

    private bool isPlayerInside = false;

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            isPlayerInside = true;
            // 唤醒 3D 头顶交互气泡提示
            HUD3DManager.Instance.ShowPrompt(transform.position + Vector3.up * 2f, promptHint);
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            isPlayerInside = false;
            HUD3DManager.Instance.HidePrompt();
        }
    }

    private void Update()
    {
        if (isPlayerInside && Input.GetKeyDown(KeyCode.E))
        {
            ExecuteEvent();
        }
    }

    public void ExecuteEvent()
    {
        HUD3DManager.Instance.HidePrompt();
        // 调度摄像机特写 + 弹出 3D 对话决策框
        CinemachineManager.Instance.FocusTarget(transform);
        ScenarioUIManager.Instance.OpenEventDialog(targetEventId);
    }
}
```

---

## 五、 项目目录规范推荐结构

在 Unity 项目的 `Assets/` 下建议组织为以下结构：
```text
Assets/
├── StreamingAssets/
│   └── Unity_Scenario_Data.json    <-- 我们导出的剧本总库
├── _Scripts/
│   ├── Core/                       <-- GameManager, TimeSystem
│   ├── Scenario/                   <-- ScenarioDataLoader, DecisionEngine
│   ├── Character/                  <-- PlayerAgentController, NavMeshMotor
│   └── UI/                         <-- PhoneCallUI, HUDController, DialogUI
├── Prefabs/
│   ├── Characters/                 <-- 包含马经理、消防员、李副区长
│   ├── Vehicles/                   <-- 消防车、警车、白色SUV
│   └── Triggers/                   <-- 空间事件交互盒
├── Environments/
│   ├── Buildings/                  <-- 花园居3栋大楼高精度模型
│   └── Streets/                    <-- 沥青街道、警戒线、绿化带
├── VFX/                            <-- 火灾体积烟雾、爆燃闪光粒子
└── Audio/                          <-- 警报音效、对讲机电音、环境风雨声
```
