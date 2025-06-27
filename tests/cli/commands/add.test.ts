import { addCommand } from '../../../src/cli/commands/add';
import * as inquirer from 'inquirer';
import * as addManual from '../../../src/cli/commands/add-manual';
import * as addFromUrl from '../../../src/cli/commands/add-from-url';

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));
jest.mock('../../../src/cli/commands/add-manual');
jest.mock('../../../src/cli/commands/add-from-url');

describe('add command', () => {
  const mockInquirer = inquirer as unknown as { prompt: jest.Mock };
  const mockAddManual = addManual as jest.Mocked<typeof addManual>;
  const mockAddFromUrl = addFromUrl as jest.Mocked<typeof addFromUrl>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prompt user to choose between manual and URL mode', async () => {
    mockInquirer.prompt.mockResolvedValueOnce({ mode: 'manual' });
    
    await addCommand();
    
    expect(mockInquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'list',
        name: 'mode',
        message: 'How would you like to add an API?',
        choices: [
          { name: '🌐 Test a live API endpoint', value: 'url' },
          { name: '📝 Create manually', value: 'manual' },
        ],
      },
    ]);
  });

  it('should call addManualCommand when manual mode is selected', async () => {
    mockInquirer.prompt.mockResolvedValueOnce({ mode: 'manual' });
    mockAddManual.addManualCommand.mockResolvedValueOnce(undefined);
    
    await addCommand();
    
    expect(mockAddManual.addManualCommand).toHaveBeenCalledTimes(1);
    expect(mockAddFromUrl.addFromUrlCommand).not.toHaveBeenCalled();
  });

  it('should call addFromUrlCommand when URL mode is selected', async () => {
    mockInquirer.prompt.mockResolvedValueOnce({ mode: 'url' });
    mockAddFromUrl.addFromUrlCommand.mockResolvedValueOnce(undefined);
    
    await addCommand();
    
    expect(mockAddFromUrl.addFromUrlCommand).toHaveBeenCalledTimes(1);
    expect(mockAddManual.addManualCommand).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Test error');
    mockInquirer.prompt.mockRejectedValueOnce(error);
    
    // Mock process.exit to prevent test from exiting
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    
    await expect(addCommand()).rejects.toThrow('process.exit called');
    
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('should handle user cancellation', async () => {
    mockInquirer.prompt.mockRejectedValueOnce(new Error('User force closed the prompt'));
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    
    await expect(addCommand()).rejects.toThrow('process.exit called');
    
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});