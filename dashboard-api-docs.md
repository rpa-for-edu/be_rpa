# Dashboard API Documentation

API endpoints required for the Dashboard Orchestrator screen.

---

## 1. Get All Robot Statuses (Aggregated)

Returns aggregated counts of robot statuses across all robots owned by the authenticated user.

### Request

```
GET /robot/all-statuses
Authorization: Bearer <access_token>
```

### Response

```json
{
  "running": 2,
  "pending": 1,
  "stopping": 0,
  "terminating": 0,
  "setup": 0,
  "executing": 1,
  "cooldown": 0,
  "stopped": 3
}
```

| Field         | Type   | Description                                      |
|---------------|--------|--------------------------------------------------|
| `running`     | number | Count of robots currently in "running" state     |
| `pending`     | number | Count of robots in "pending" state               |
| `stopping`    | number | Count of robots being stopped                    |
| `terminating` | number | Count of robots being terminated                 |
| `setup`       | number | Count of robots in setup phase                   |
| `executing`   | number | Count of robots actively executing               |
| `cooldown`    | number | Count of robots in cooldown phase                |
| `stopped`     | number | Count of robots that are stopped / not running   |

### Implementation Notes

- Query the `robot_run_log` table grouped by `instance_state`, filtered by `user_id`
- Only count the latest state per robot (latest `created_date` per `process_id_version`)
- The backend controller should be placed in the existing `RobotController` or a new `DashboardController`

---

## 2. Get Dashboard Jobs History (Aggregated)

Returns pass/fail/stopped counts aggregated across all robots for the authenticated user, optionally filtered by date.

### Request

```
GET /robot-report/dashboard/jobs-history?date=<ISO_DATE>
Authorization: Bearer <access_token>
```

| Param  | Type   | Required | Description                                      |
|--------|--------|----------|--------------------------------------------------|
| `date` | string | No       | ISO date string to filter from (e.g., `2025-11-23T04:00:00Z`) |

### Response

```json
{
  "successful": 6,
  "faulted": 2,
  "stopped": 0,
  "total": 8
}
```

| Field        | Type   | Description                                |
|--------------|--------|--------------------------------------------|
| `successful` | number | Count of executions where `passed > 0 AND failed = 0` |
| `faulted`    | number | Count of executions where `failed > 0`     |
| `stopped`    | number | Count of executions that were stopped      |
| `total`      | number | Total count of all executions              |

### Implementation Notes

- Query `robot_run_overall` table filtered by `user_id`
- Group by outcome: `passed > 0 AND failed = 0` → successful, `failed > 0` → faulted
- Apply optional date filter on `created_date`

---

## 3. Get Dashboard Transactions Timeline

Returns time-series transaction data across all robots for charting.

### Request

```
GET /robot-report/dashboard/transactions?date=<ISO_DATE>
Authorization: Bearer <access_token>
```

| Param  | Type   | Required | Description                                       |
|--------|--------|----------|---------------------------------------------------|
| `date` | string | No       | ISO date to filter from (e.g., `2025-11-23T04:00:00Z`) |

### Response

```json
{
  "labels": ["04:00", "05:00", "06:00", "07:00", "08:00"],
  "data": [0, 1, 3, 2, 1],
  "total": 7
}
```

| Field    | Type     | Description                                          |
|----------|----------|------------------------------------------------------|
| `labels` | string[] | Time bucket labels for x-axis                        |
| `data`   | number[] | Count of transactions in each time bucket            |
| `total`  | number   | Total transaction count in the period                |

### Implementation Notes

- Query `robot_run_overall` table filtered by `user_id` and date range
- Group by time buckets (hourly for Last day, daily for Last week/30 days, per-minute for Last hour)
- Return aggregated counts per bucket
