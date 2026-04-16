class ElectricityAgent:
    def __init__(self, usage_data):
        self.usage_data = usage_data
        
    def get_dashboard_metrics(self):
        # Default empty states
        today_kwh = 0.0
        month_kwh = 0.0
        est_bill = 0.0
        peak_load = 0.0
        
        if self.usage_data:
            from datetime import date
            today = date.today()
            
            # Today's usage
            today_records = [r for r in self.usage_data if r.date == today]
            today_kwh = sum(r.kwh for r in today_records)
            
            # Month's usage (simplified: all records in DB representing the current tracking month)
            month_kwh = sum(r.kwh for r in self.usage_data)
            
            # Estimated bill (simply total cost scaled or just total cost for now)
            total_cost = sum(r.cost for r in self.usage_data)
            dates = set(r.date for r in self.usage_data)
            days_recorded = len(dates) if len(dates) > 0 else 1
            daily_avg_cost = total_cost / days_recorded
            est_bill = daily_avg_cost * 30
            
            # Simulated Peak load (Max single appliance usage)
            peak_load = max((r.kwh for r in self.usage_data), default=0.0)

        return {
            "today_usage": round(today_kwh, 2),
            "month_usage": round(month_kwh, 2),
            "est_bill": round(est_bill, 2),
            "peak_load": round(peak_load, 2)
        }

    def suggest_savings(self):
        tips = [
            "Adjust your AC temperature by 2°C to cut cooling costs by 10%.",
            "Switch off the water heater during the day. It accounts for big load spikes.",
            "Run washing machine only on full loads.",
            "Your lighting consumes constant energy. Switch to LEDs if not already.",
            "Unplug screens and TVs when not actively watching to reduce standby power."
        ]
        import random
        return random.sample(tips, 3)
