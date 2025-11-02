namespace GroupManagementService.Models
{
    // Quỹ chung của nhóm
    public class Fund
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public string Name { get; set; } = "Quỹ chung";
        public decimal Balance { get; set; } = 0m;

        public List<FundTransaction> Transactions { get; set; } = new();

        public Group? Group { get; set; }
    }
}


