//! The five-field cron schedules of src/utils/cronRunner.js, read in a named time zone.

use chrono::{DateTime, Datelike, DurationRound, TimeDelta, Timelike, Utc};
use chrono_tz::Tz;

/// `getNextCronRun` looks at most this many minutes ahead (10 days).
const HORIZON_MINUTES: usize = 14_400;

/// `Number.parseInt` of one field part; None where JavaScript gives NaN (which matches nothing).
fn number(text: &str) -> Option<i64> {
    crate::write::parse_int(&serde_json::Value::from(text))
}

/// `parseCronField`: the values a field allows, between `min` and `max` for `*` and open steps.
fn field(text: &str, min: i64, max: i64) -> Vec<i64> {
    if text == "*" {
        return (min..=max).collect();
    }
    let mut values = Vec::new();
    for part in text.split(',') {
        let mut step_parts = part.split('/');
        let range = step_parts.next().unwrap_or("");
        let step = step_parts.next();
        let mut bounds = range.split('-');
        let first = bounds.next().unwrap_or("");
        let second = bounds.next();
        match step {
            Some(step) => {
                let (start, end) = match (range, second) {
                    ("*", _) => (Some(min), Some(max)),
                    (_, Some(end)) => (number(first), number(end)),
                    _ => (number(range), Some(max)),
                };
                let (Some(start), Some(end)) = (start, end) else { continue };
                match number(step) {
                    // Node loops forever on a step below 1; nothing is a safer answer.
                    Some(step) if step < 1 => {}
                    // No field goes past 59, so a huge range adds nothing.
                    Some(step) => values.extend((start..=end.min(max + 1)).step_by(step as usize)),
                    None if start <= end => values.push(start),
                    None => {}
                }
            }
            None => match second {
                Some(end) => {
                    if let (Some(start), Some(end)) = (number(first), number(end)) {
                        values.extend(start..=end.min(max + 1));
                    }
                }
                None => values.extend(number(part)),
            },
        }
    }
    values
}

pub struct Schedule {
    minutes: Vec<i64>,
    hours: Vec<i64>,
    days: Vec<i64>,
    months: Vec<i64>,
    weekdays: Vec<i64>,
}

impl Schedule {
    pub fn parse(expression: &str) -> Option<Self> {
        let [minute, hour, day, month, weekday] = expression.split_whitespace().collect::<Vec<_>>()[..] else { return None };
        Some(Self {
            minutes: field(minute, 0, 59),
            hours: field(hour, 0, 23),
            days: field(day, 1, 31),
            months: field(month, 1, 12),
            weekdays: field(weekday, 0, 6).into_iter().map(|d| if d == 7 { 0 } else { d }).collect(),
        })
    }

    /// `isCronDue`
    pub fn is_due(&self, at: DateTime<Utc>, zone: Tz) -> bool {
        let t = at.with_timezone(&zone);
        self.minutes.contains(&t.minute().into())
            && self.hours.contains(&t.hour().into())
            && self.days.contains(&t.day().into())
            && self.months.contains(&t.month().into())
            && self.weekdays.contains(&t.weekday().num_days_from_sunday().into())
    }
}

/// A zone name as `Intl` accepts it (any letter case); None for an unknown one.
pub fn zone(name: &str) -> Option<Tz> {
    Tz::from_str_insensitive(name).ok()
}

/// `getNextCronRun`: the first due minute after `start`.
pub fn next_run(expression: &str, start: DateTime<Utc>, zone: Tz) -> Option<DateTime<Utc>> {
    let schedule = Schedule::parse(expression)?;
    let mut at = start.duration_trunc(TimeDelta::minutes(1)).ok()?;
    (0..HORIZON_MINUTES).find_map(|_| {
        at += TimeDelta::minutes(1);
        schedule.is_due(at, zone).then_some(at)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn next_runs_match_node() {
        // Made with getNextCronRun(expr, new Date('2026-03-07T22:07:30Z'), zone) in src/utils/cronRunner.js.
        let start: DateTime<Utc> = "2026-03-07T22:07:30Z".parse().unwrap();
        for (expression, name, want) in CASES {
            let got = next_run(expression, start, zone(name).unwrap()).map(|d| d.format("%Y-%m-%dT%H:%MZ").to_string());
            assert_eq!(got.as_deref(), *want, "{expression} {name}");
        }
    }

    #[test]
    fn zones_ignore_case_and_unknown_ones_are_refused() {
        assert_eq!(zone("asia/kolkata"), Some(chrono_tz::Asia::Kolkata));
        assert_eq!(zone("Nowhere/City"), None);
    }

    const CASES: &[(&str, &str, Option<&str>)] = &[
        ("* * * * *", "UTC", Some("2026-03-07T22:08Z")),
        ("*/15 * * * *", "UTC", Some("2026-03-07T22:15Z")),
        ("0 2 * * *", "Asia/Kolkata", Some("2026-03-08T20:30Z")),
        ("30 2 * * *", "America/New_York", Some("2026-03-09T06:30Z")),
        ("0 0 * * 0", "UTC", Some("2026-03-08T00:00Z")),
        ("0 0 * * 7", "Europe/London", Some("2026-03-08T00:00Z")),
        ("5-10/2 */6 * * *", "UTC", Some("2026-03-08T00:05Z")),
        ("1,31 9-17 * * 1-5", "Australia/Adelaide", Some("2026-03-08T22:31Z")),
        ("0 0 31 2 *", "UTC", None),
        ("bad", "UTC", None),
        ("10/20 * * * *", "Asia/Kathmandu", Some("2026-03-07T22:25Z")),
        ("0 12 10-12 3 *", "UTC", Some("2026-03-10T12:00Z")),
    ];
}
