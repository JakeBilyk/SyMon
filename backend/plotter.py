import pandas as pd
import matplotlib.pyplot as plt

# Function to parse the log file
def parse_log_file(file_path):
    data = {
        'timestamp': [],
        'tank_id': [],
        'pH': [],
        'temperature': []
    }

    with open(file_path, 'r', encoding='utf-8') as f:  # Ensure proper encoding
        for line in f:
            parts = line.split(' - ')
            timestamp = parts[0].strip()  # ISO formatted timestamp
            tank_info = parts[1].split(':')
            tank_id = tank_info[0].strip().split(' ')[1]  # Get Tank ID (e.g., C08)
            pH = float(tank_info[1].split(',')[0].split('=')[1].strip())  # Get pH value
            
            # Parse temperature, removing unwanted characters
            temperature = float(''.join(c for c in tank_info[1].split(',')[1].split('=')[1] if (c.isdigit() or c == '.' or c == '-')).strip())
            
            # Append to data
            data['timestamp'].append(timestamp)
            data['tank_id'].append(tank_id)
            data['pH'].append(pH)
            data['temperature'].append(temperature)

    return pd.DataFrame(data)

# Filter out tanks that have reached a temperature of 30°C or more
def filter_tanks(df):
    # Find tanks where max temperature is below 30°C
    valid_tanks = df.groupby('tank_id')['temperature'].max().reset_index()
    valid_tanks = valid_tanks[valid_tanks['temperature'] < 30]['tank_id'].tolist()

    # Filter the dataframe for tanks with pH >= 1 and max temperature < 30°C
    df = df[(df['tank_id'].isin(valid_tanks)) & (df['pH'] >= 1)]

    return df

# Plot pH values for valid tanks
def plot_pH(df):
    df['timestamp'] = pd.to_datetime(df['timestamp'])  # Convert to datetime

    fig, ax = plt.subplots(figsize=(10, 6))

    d_tanks = df['tank_id'].unique()
    colors = plt.cm.get_cmap('tab10', len(d_tanks))

    for i, tank in enumerate(d_tanks):
        tank_data = df[df['tank_id'] == tank]
        highlight = tank_data['pH'].max() >= 4

        if highlight:
            ax.plot(tank_data['timestamp'], tank_data['pH'], color=colors(i), label=f'{tank} pH', linewidth=2, marker='o')
        else:
            ax.plot(tank_data['timestamp'], tank_data['pH'], color=colors(i), label=f'{tank} pH', linewidth=1)

    ax.set_xlabel('Time')
    ax.set_ylabel('pH')
    ax.legend(loc='upper left')
    plt.title('pH Levels Over Time for Tanks Starting with "D" (Highlighted if pH >= 4)')
    plt.show()

# Plot temperature values for valid tanks
def plot_temperature(df):
    df['timestamp'] = pd.to_datetime(df['timestamp'])  # Convert to datetime

    fig, ax = plt.subplots(figsize=(10, 6))

    d_tanks = df['tank_id'].unique()
    colors = plt.cm.get_cmap('tab10', len(d_tanks))

    for i, tank in enumerate(d_tanks):
        tank_data = df[df['tank_id'] == tank]
        ax.plot(tank_data['timestamp'], tank_data['temperature'], color=colors(i), linestyle='--', label=f'{tank} Temp')

    ax.set_xlabel('Time')
    ax.set_ylabel('Temperature (°C)')
    ax.legend(loc='upper left')
    plt.title('Temperature Levels Over Time for Tanks Starting with "D"')
    plt.show()

# Path to your log file
log_file_path = 'tank-data-log.txt'  # Update with the actual path to your log file

# Parse the log file
df = parse_log_file(log_file_path)

# Filter the data (remove tanks with temperature ≥ 30°C and pH < 1)
df = filter_tanks(df)

# Plot pH and temperature for valid tanks
plot_pH(df)            # Plot pH values
plot_temperature(df)    # Plot temperature values
