import json
import os

with open('e:/xuexi/舆情演练系统trea/longnight-prototype/scenario_database_utf8.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

# 转换结构适配 Unity 3D
unity_package = {
    "version": "1.0",
    "project": "LongNightFire_Unity3D",
    "roles": raw_data.get("roles", []),
    "paths": raw_data.get("paths", []),
    "scenes": []
}

# 提取场景及事件
for sc in raw_data.get("scenes", []):
    scene_id = sc.get("id")
    scene_title = sc.get("title")
    scene_time = sc.get("time")
    
    # 查找该场景在 play 中的事件链
    play_key = f"scene{scene_id}"
    play_events = raw_data.get("play", {}).get(play_key, [])
    
    # 处理如果是 dict 的场景 (scene2 可能是 dict: { A: [...], B: [...], C: [...] })
    normalized_events = []
    if isinstance(play_events, list):
        normalized_events = play_events
    elif isinstance(play_events, dict):
        for route_k, ev_list in play_events.items():
            for ev in ev_list:
                ev_copy = dict(ev)
                ev_copy["route_source"] = route_k
                normalized_events.append(ev_copy)
                
    unity_scene = {
        "sceneId": scene_id,
        "title": scene_title,
        "timeSpan": scene_time,
        "routes": sc.get("routes", {}),
        "events": normalized_events
    }
    unity_package["scenes"].append(unity_scene)

output_file = 'e:/xuexi/舆情演练系统trea/longnight-prototype/Unity_Scenario_Data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(unity_package, f, ensure_ascii=False, indent=2)

print(f"Unity data export completed: {output_file}")
print("Total scenes exported:", len(unity_package["scenes"]))
