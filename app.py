#!/usr/bin/env python3

import os
import time
import threading

from flask import Flask, jsonify, send_from_directory

import rclpy
from rclpy.node import Node
from std_msgs.msg import String


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=BASE_DIR)

latest_data = {
    "pi3_alive": False,
    "emergency": False,
    "level": None,
    "water_temp": None,
    "ph": None,
    "tds": None,
    "air_temp": None,
    "humidity": None,
    "last_update": None,
}


def to_float(value):
    if value is None:
        return None

    try:
        return float(value)
    except ValueError:
        return None


def parse_monitor_state(text):
    """
    /monitor/state 예시:
    pi3_alive:True,emergency:False,sensor_tds:526.00,sensor_ph:8.96,sensor_water_temp:23.75
    """
    parsed = {}

    for item in text.split(","):
        item = item.strip()

        if ":" not in item:
            continue

        key, value = item.split(":", 1)
        parsed[key.strip()] = value.strip()

    return parsed


class DashboardBridgeNode(Node):
    def __init__(self):
        super().__init__("dashboard_bridge_node")

        self.create_subscription(
            String,
            "/monitor/state",
            self.monitor_callback,
            10
        )

        self.get_logger().info("Dashboard bridge node started")

    def monitor_callback(self, msg):
        global latest_data

        parsed = parse_monitor_state(msg.data)

        latest_data["pi3_alive"] = parsed.get("pi3_alive", "False") == "True"
        latest_data["emergency"] = parsed.get("emergency", "False") == "True"

        latest_data["tds"] = to_float(parsed.get("sensor_tds"))
        latest_data["ph"] = to_float(parsed.get("sensor_ph"))
        latest_data["water_temp"] = to_float(parsed.get("sensor_water_temp"))
        latest_data["air_temp"] = to_float(parsed.get("sensor_air_temp"))
        latest_data["humidity"] = to_float(parsed.get("sensor_humidity"))

        # 현재 master_node에는 수위 센서가 없으므로 일단 None 유지
        latest_data["level"] = to_float(parsed.get("sensor_level"))

        latest_data["last_update"] = time.strftime("%Y-%m-%d %H:%M:%S")


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/style.css")
def style_css():
    return send_from_directory(BASE_DIR, "style.css")


@app.route("/script.js")
def script_js():
    return send_from_directory(BASE_DIR, "script.js")


@app.route("/api/sensors")
def api_sensors():
    return jsonify(latest_data)


def ros_thread_main():
    rclpy.init()
    node = DashboardBridgeNode()

    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


def main():
    ros_thread = threading.Thread(target=ros_thread_main, daemon=True)
    ros_thread.start()

    app.run(host="0.0.0.0", port=8080, debug=False)


if __name__ == "__main__":
    main()