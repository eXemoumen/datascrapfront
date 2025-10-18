# Enhanced Stats API Integration

To make the data insights work, your backend API should return enhanced stats that include top products and locations. Here's an example of what your `/api/stats` endpoint should return:

## Example API Response

```json
{
  "total": 1500,
  "checked": 450,
  "unchecked": 1050,
  "today": 25,
  "topProducts": [
    { "product": "Fruits", "count": 222 },
    { "product": "autres", "count": 202 },
    { "product": "fruits et légumes", "count": 150 },
    { "product": "Huile", "count": 88 },
    { "product": "Investissement capitaux", "count": 67 },
    { "product": "Bio", "count": 63 }
  ],
  "topLocations": [
    { "location": "alger", "count": 1154 },
    { "location": "oran", "count": 17 },
    { "location": "biskra", "count": 7 },
    { "location": "tlemcen", "count": 5 },
    { "location": "annaba", "count": 5 },
    { "location": "constantine", "count": 4 }
  ]
}
```

## Backend Implementation Example

If you're using Python/Flask or similar, you could add this to your stats endpoint:

```python
@app.route('/api/stats')
def get_stats():
    # Your existing stats logic
    total = get_total_announcements()
    checked = get_checked_count()
    unchecked = get_unchecked_count()
    today = get_today_count()

    # New: Top products analysis
    top_products = get_top_products(limit=10)

    # New: Top locations analysis
    top_locations = get_top_locations(limit=10)

    return {
        "total": total,
        "checked": checked,
        "unchecked": unchecked,
        "today": today,
        "topProducts": top_products,
        "topLocations": top_locations
    }

def get_top_products(limit=10):
    # SQL query to get top products
    query = """
    SELECT products, COUNT(*) as count
    FROM announcements
    WHERE products IS NOT NULL AND products != ''
    GROUP BY products
    ORDER BY count DESC
    LIMIT ?
    """
    # Execute query and return formatted results
    return [{"product": row[0], "count": row[1]} for row in results]

def get_top_locations(limit=10):
    # Similar for locations
    query = """
    SELECT location, COUNT(*) as count
    FROM announcements
    WHERE location IS NOT NULL AND location != ''
    GROUP BY location
    ORDER BY count DESC
    LIMIT ?
    """
    return [{"location": row[0], "count": row[1]} for row in results]
```

## Features Added

1. **Data Insights Dashboard**: Shows top products and locations with visual progress bars
2. **Quick Filter Buttons**: One-click filtering for top products and locations
3. **Enhanced Analytics**: Shows completion percentage and filter results
4. **Visual Progress Bars**: Proportional bars showing relative counts
5. **Responsive Design**: Works on all screen sizes

The dashboard will automatically show these insights when your API returns the enhanced stats data!
