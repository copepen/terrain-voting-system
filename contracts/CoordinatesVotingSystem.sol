// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CoordinatesVotingSystem is ReentrancyGuard {
    // Info of point
    struct Point {
        uint256 x;
        uint256 y;
    }

    // Info of terrain
    struct Terrain {
        Point point1;
        Point point2;
        address owner;
    }

    // Info of proposal
    struct Proposal {
        uint256 voteCnt;
        address creator;
        Terrain terrain;
    }

    uint256 public totalOwnerCnt;
    uint8 public immutable MAXIMUM_TERRAIN_SIZE;
    Terrain[] public maps;

    // x value => y value => owner address
    mapping(uint256 => mapping(uint256 => address)) public terrainOwners;
    // owner address => status
    mapping(address => bool) public owners;
    // proposal name => proposal
    mapping(string => Proposal) public buyProposals;
    // proposal name => proposal
    mapping(string => Proposal) public extendProposals;
    // user => proposal name => status
    mapping(address => mapping(string => bool)) public hasBuyProposaled;
    // user => proposal name => status
    mapping(address => mapping(string => bool)) public hasExtendProposaled;
    // user => proposal name => status
    mapping(address => mapping(string => bool)) public terrainVoters;
    // user => proposal name => status
    mapping(address => mapping(string => bool)) public mapVoters;

    /**
     * @dev Emitted when a new terrain is added
     */
    event TerrianAdded(
        address indexed user,
        Terrain terrain,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a new map is added
     */
    event MapAdded(address indexed user, Terrain terrain, uint256 timestamp);

    /**
     * @dev Emitted when owner of terrain is changed
     */
    event TerrianOwnerChanged(
        address indexed user,
        Terrain terrain,
        uint256 timestamp
    );

    /**
     * @dev Emitted when buy proposal is created
     */
    event BuyProposalCrated(
        address indexed user,
        string proposalName,
        uint256 timestamp
    );

    /**
     * @dev Emitted when extend proposal is created
     */
    event ExtendProposalCrated(
        address indexed user,
        string proposalName,
        uint256 timestamp
    );

    /**
     * @dev Emitted when buy proposal is voted
     */
    event BuyProposalVoted(
        address indexed owner,
        string proposalName,
        uint256 timestamp
    );

    /**
     * @dev Emitted when extend proposal is voted
     */
    event ExtendProposalVoted(
        address indexed owner,
        string proposalName,
        uint256 timestamp
    );

    modifier onlyOwner(address _user) {
        require(owners[msg.sender], "Not owner");
        _;
    }

    /**
     * @notice Initialize contract
     * @param _x1     x value of left
     * @param _x2     x value of right
     * @param _y1     y value of top
     * @param _y2     y value of bottom
     */
    constructor(
        uint256 _x1,
        uint256 _x2,
        uint256 _y1,
        uint256 _y2
    ) {
        require(_x2 > _x1, "Incorrect x order");
        require(_y2 > _y1, "Incorrect y order");
        (
            uint256 x1,
            uint256 x2,
            uint256 y1,
            uint256 y2
        ) = _sortCoordinatePoints(_x1, _x2, _y1, _y2);

        Terrain memory _terrain = Terrain(
            Point(x1, y1),
            Point(x2, y2),
            msg.sender
        );

        maps.push(_terrain);
        owners[msg.sender] = true;
        totalOwnerCnt += 1;
        MAXIMUM_TERRAIN_SIZE = 3;

        emit TerrianAdded(msg.sender, _terrain, block.timestamp);
    }

    /**
     * @notice Sort coordinate points
     * @param _x1     x value of bottom left point
     * @param _x2     x value of bottom right point
     * @param _y1     y value of top left point
     * @param _y2     y value of top right point
     * @return x1     x value of bottom left point
     * @return x2     x value of bottom right point
     * @return y1     y value of top left point
     * @return y2     y value of top right point
     */
    function _sortCoordinatePoints(
        uint256 _x1,
        uint256 _x2,
        uint256 _y1,
        uint256 _y2
    )
        internal
        pure
        returns (
            uint256 x1,
            uint256 x2,
            uint256 y1,
            uint256 y2
        )
    {
        x1 = _x1;
        x2 = _x2;
        y1 = _y1;
        y2 = _y2;
        if (_x1 > _x2) {
            x1 = _x2;
            x2 = _x1;
        }
        if (_y1 > _y2) {
            y1 = _y2;
            y2 = _y1;
        }
    }

    /**
     * @notice Check if terrain can be sold
     * @param _x1     x value of left
     * @param _x2     x value of right
     * @param _y1     y value of top
     * @param _y2     y value of bottom
     * @return isValid     valid status of terrain
     */
    function _isValidTerrain(
        uint256 _x1,
        uint256 _x2,
        uint256 _y1,
        uint256 _y2
    ) internal view returns (bool isValid) {
        isValid = true;

        if (
            _x2 > _x1 + MAXIMUM_TERRAIN_SIZE || _y2 > _y1 + MAXIMUM_TERRAIN_SIZE
        ) {
            isValid = false;
            revert("Out of terrain size");
        }
        for (uint256 x = _x1; x < _x2; x++) {
            for (uint256 y = _y1; y < _y2; y++) {
                if (terrainOwners[x][y] != address(0)) {
                    isValid = false;
                    break;
                }
            }
        }
    }

    /**
     * @notice Check if terrain or map is inside map array
     * @param _x1     x value of left
     * @param _x2     x value of right
     * @param _y1     y value of top
     * @param _y2     y value of bottom
     * @return isInside     valid status of terrain
     */
    function _isInsideMap(
        uint256 _x1,
        uint256 _x2,
        uint256 _y1,
        uint256 _y2
    ) internal view returns (bool isInside) {
        isInside = true;
        for (uint256 i = 0; i < maps.length; i++) {
            Terrain memory map = maps[i];
            if (
                _x1 < map.point1.x ||
                _x2 > map.point2.x ||
                _y1 < map.point1.y ||
                _y2 > map.point2.y
            ) {
                isInside = false;
                break;
            }
        }
    }

    /**
     * @notice Set terrain owner
     * @param _x1     x value of left
     * @param _x2     x value of right
     * @param _y1     y value of top
     * @param _y2     y value of bottom
     */
    function _setTerrainOwner(
        uint256 _x1,
        uint256 _x2,
        uint256 _y1,
        uint256 _y2,
        address _owner
    ) internal {
        for (uint256 x = _x1; x < _x2; x++) {
            for (uint256 y = _y1; y < _y2; y++) {
                if (terrainOwners[x][y] == address(0)) {
                    terrainOwners[x][y] = _owner;
                } else {
                    revert("Set terrain owner failed");
                }
            }
        }
    }

    /**
     * @notice Get buy proposal
     * @param _name     proposal name
     * @return      proposal info
     */
    function getBuyProposal(string memory _name)
        public
        view
        returns (Proposal memory)
    {
        return buyProposals[_name];
    }

    /**
     * @notice Get extend proposal
     * @param _name     proposal name
     * @return      proposal info
     */
    function getExtendProposal(string memory _name)
        public
        view
        returns (Proposal memory)
    {
        return extendProposals[_name];
    }

    /**
     * @notice Get buy proposal status
     * @param _user     user address
     * @param _name     proposal name
     * @return    proposal status
     */
    function getBuyProposalStatus(address _user, string memory _name)
        public
        view
        returns (bool)
    {
        return hasBuyProposaled[_user][_name];
    }

    /**
     * @notice Get extend proposal status
     * @param _user     user address
     * @param _name     proposal name
     * @return    proposal status
     */
    function getExtendProposalStatus(address _user, string memory _name)
        public
        view
        returns (bool)
    {
        return hasExtendProposaled[_user][_name];
    }

    /**
     * @notice Get terrain voter status
     * @param _user     user address
     * @param _name     proposal name
     * @return    voter status
     */
    function getTerrainVoterStatus(address _user, string memory _name)
        public
        view
        returns (bool)
    {
        return terrainVoters[_user][_name];
    }

    /**
     * @notice Get map voter status
     * @param _user     user address
     * @param _name     proposal name
     * @return    voter status
     */
    function getMapVoterStatus(address _user, string memory _name)
        public
        view
        returns (bool)
    {
        return mapVoters[_user][_name];
    }

    /**
     * @notice Create a proposal to buy terrain
     * @param _name     name of proposal
     * @param _x1     x value of bottom left point
     * @param _x2     x value of bottom right point
     * @param _y1     y value of top left point
     * @param _y2     y value of top right point
     */
    function makeBuyProposal(
        string memory _name,
        uint256 _x1,
        uint256 _x2,
        uint256 _y1,
        uint256 _y2
    ) external {
        require(
            buyProposals[_name].creator == address(0),
            "Proposal name was already used"
        );

        (
            uint256 x1,
            uint256 x2,
            uint256 y1,
            uint256 y2
        ) = _sortCoordinatePoints(_x1, _x2, _y1, _y2);

        require(_isInsideMap(x1, x2, y1, y2), "Terrain is not in map");
        require(_isValidTerrain(x1, x2, y1, y2), "Terrain was already sold");

        Proposal memory _proposal = Proposal(
            0,
            msg.sender,
            Terrain(Point(x1, y1), Point(x2, y2), msg.sender)
        );
        buyProposals[_name] = _proposal;
        hasBuyProposaled[msg.sender][_name] = true;

        emit BuyProposalCrated(msg.sender, _name, block.timestamp);
    }

    /**
     * @notice Vote on a proposal to buy terrain
     * @param _name     name of proposal
     */
    function voteTerrainProposal(string memory _name)
        external
        onlyOwner(msg.sender)
    {
        Proposal memory _proposal = buyProposals[_name];
        require(
            buyProposals[_name].creator != msg.sender,
            "Proposal can't be voted by proposal creator"
        );
        require(
            buyProposals[_name].creator != address(0),
            "Proposal was not made with this name"
        );
        require(!terrainVoters[msg.sender][_name], "Already voted");

        terrainVoters[msg.sender][_name] = true;
        buyProposals[_name].voteCnt += 1;
        if (totalOwnerCnt == buyProposals[_name].voteCnt) {
            totalOwnerCnt += 1;
            owners[_proposal.creator] = true;
            _setTerrainOwner(
                _proposal.terrain.point1.x,
                _proposal.terrain.point2.x,
                _proposal.terrain.point1.y,
                _proposal.terrain.point2.y,
                _proposal.creator
            );

            emit TerrianOwnerChanged(
                msg.sender,
                _proposal.terrain,
                block.timestamp
            );
        }
        emit BuyProposalVoted(msg.sender, _name, block.timestamp);
    }

    /**
     * @notice Create a proposal to extend terrain
     * @param _name     name of proposal
     * @param _x1     x value of bottom left point
     * @param _x2     x value of bottom right point
     * @param _y1     y value of top left point
     * @param _y2     y value of top right point
     */
    function makeExtendProposal(
        string memory _name,
        uint256 _x1,
        uint256 _x2,
        uint256 _y1,
        uint256 _y2
    ) external {
        require(
            extendProposals[_name].creator == address(0),
            "Extend Proposal name was already used"
        );

        (
            uint256 x1,
            uint256 x2,
            uint256 y1,
            uint256 y2
        ) = _sortCoordinatePoints(_x1, _x2, _y1, _y2);

        require(
            !_isInsideMap(x1, x2, y1, y2),
            "Map is overlapped with existing maps"
        );

        Proposal memory _proposal = Proposal(
            0,
            msg.sender,
            Terrain(Point(x1, y1), Point(x2, y2), msg.sender)
        );
        extendProposals[_name] = _proposal;
        hasExtendProposaled[msg.sender][_name] = true;

        emit ExtendProposalCrated(msg.sender, _name, block.timestamp);
    }

    /**
     * @notice Vote on a proposal to extend map
     * @param _name     name of proposal
     */
    function voteMapProposal(string memory _name)
        external
        onlyOwner(msg.sender)
    {
        Proposal memory _proposal = extendProposals[_name];
        require(
            extendProposals[_name].creator != msg.sender,
            "Proposal can't be voted by proposal creator"
        );
        require(
            extendProposals[_name].creator != address(0),
            "Proposal was not made with this name"
        );
        require(!mapVoters[msg.sender][_name], "Already voted");

        mapVoters[msg.sender][_name] = true;
        extendProposals[_name].voteCnt += 1;
        if (totalOwnerCnt == extendProposals[_name].voteCnt) {
            maps.push(_proposal.terrain);
            emit MapAdded(msg.sender, _proposal.terrain, block.timestamp);
        }
        emit ExtendProposalVoted(msg.sender, _name, block.timestamp);
    }
}
